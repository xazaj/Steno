use std::env;
use std::path::PathBuf;
use std::fs;

fn main() {
    let whisper_cpp_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("lib")
        .join("whisper.cpp");
    
    // Get target OS for platform-specific configuration
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap();
    
    // Platform-specific library paths
    let (whisper_lib_path, ggml_lib_path, ggml_blas_path, ggml_metal_path) = if target_os == "windows" {
        // Windows uses different build structure
        let whisper_lib = whisper_cpp_path.join("build").join("src").join("Release");
        let ggml_lib = whisper_cpp_path.join("build").join("ggml").join("src").join("Release");
        let ggml_blas = ggml_lib.join("ggml-blas");
        let ggml_metal = ggml_lib.join("ggml-metal");
        (whisper_lib, ggml_lib, ggml_blas, ggml_metal)
    } else {
        // Unix-like systems
        let whisper_lib = whisper_cpp_path.join("build").join("src");
        let ggml_lib = whisper_cpp_path.join("build").join("ggml").join("src");
        let ggml_blas = ggml_lib.join("ggml-blas");
        let ggml_metal = ggml_lib.join("ggml-metal");
        (whisper_lib, ggml_lib, ggml_blas, ggml_metal)
    };
    
    // Check if essential library files exist (handle different platforms)
    let whisper_static_lib = if target_os == "windows" {
        whisper_lib_path.join("whisper.lib")
    } else {
        whisper_lib_path.join("libwhisper.a")
    };
    
    if !whisper_static_lib.exists() {
        panic!("Whisper static library not found at: {}\nPlease build whisper.cpp first using:\n  cd src-tauri/lib/whisper.cpp\n  mkdir -p build\n  cd build\n  cmake .. -DCMAKE_BUILD_TYPE=Release{}\n  cmake --build . --config Release", 
               whisper_static_lib.display(),
               if target_os == "windows" { " -G \"Visual Studio 17 2022\" -A x64" } else { "" });
    }

    // Add library search paths
    println!("cargo:rustc-link-search=native={}", whisper_lib_path.display());
    println!("cargo:rustc-link-search=native={}", ggml_lib_path.display());
    println!("cargo:rustc-link-search=native={}", ggml_blas_path.display());
    
    // Only add metal path on macOS
    if target_os == "macos" {
        println!("cargo:rustc-link-search=native={}", ggml_metal_path.display());
    }

    // Core whisper.cpp libraries (all platforms)
    println!("cargo:rustc-link-lib=static=whisper");
    println!("cargo:rustc-link-lib=static=ggml-base");
    println!("cargo:rustc-link-lib=static=ggml-cpu");
    println!("cargo:rustc-link-lib=static=ggml-blas");
    println!("cargo:rustc-link-lib=static=ggml");

    // Platform-specific linking
    match target_os.as_str() {
        "macos" => {
            // macOS-specific frameworks and libraries
            println!("cargo:rustc-link-lib=static=ggml-metal");
            println!("cargo:rustc-link-lib=framework=Foundation");
            println!("cargo:rustc-link-lib=framework=Accelerate");
            println!("cargo:rustc-link-lib=framework=CoreFoundation");
            println!("cargo:rustc-link-lib=framework=CoreGraphics");
            println!("cargo:rustc-link-lib=framework=Metal");
            println!("cargo:rustc-link-lib=c++");
        },
        "windows" => {
            // Windows-specific libraries
            println!("cargo:rustc-link-lib=user32");
            println!("cargo:rustc-link-lib=kernel32");
            println!("cargo:rustc-link-lib=gdi32");
            println!("cargo:rustc-link-lib=winspool");
            println!("cargo:rustc-link-lib=shell32");
            println!("cargo:rustc-link-lib=ole32");
            println!("cargo:rustc-link-lib=oleaut32");
            println!("cargo:rustc-link-lib=uuid");
            println!("cargo:rustc-link-lib=comdlg32");
            println!("cargo:rustc-link-lib=advapi32");
        },
        "linux" => {
            // Linux-specific libraries
            println!("cargo:rustc-link-lib=stdc++");
            println!("cargo:rustc-link-lib=m");
            println!("cargo:rustc-link-lib=pthread");
        },
        _ => {
            // Default for other Unix-like systems
            println!("cargo:rustc-link-lib=stdc++");
            println!("cargo:rustc-link-lib=m");
            println!("cargo:rustc-link-lib=pthread");
        }
    }

    println!("cargo:rerun-if-changed=build.rs");
    // Platform-specific rerun triggers
    if target_os == "windows" {
        println!("cargo:rerun-if-changed={}/whisper.lib", whisper_lib_path.display());
    } else {
        println!("cargo:rerun-if-changed={}/libwhisper.a", whisper_lib_path.display());
    }
    println!("cargo:rerun-if-changed={}", whisper_cpp_path.join("CMakeLists.txt").display());
    println!("cargo:rerun-if-changed={}", whisper_cpp_path.join("src").join("whisper.cpp").display());

    // --- FFI 绑定生成 ---
    let header_path = whisper_cpp_path.join("include").join("whisper.h");
    
    // Check if header file exists
    if !header_path.exists() {
        panic!("Whisper header file not found at: {}. Please ensure git submodules are initialized and whisper.cpp is built.", header_path.display());
    }
    
    println!("cargo:rerun-if-changed={}", header_path.display());

    let bindings = bindgen::Builder::default()
        .header(header_path.to_str().unwrap())
        // 告诉 clang 在哪里寻找 ggml.h
        .clang_arg(format!(
            "-I{}",
            whisper_cpp_path.join("ggml").join("include").display()
        ))
        // 告诉 bindgen 我们希望它为 C++ 代码生成绑定
        .clang_arg("-x")
        .clang_arg("c++")
        .allowlist_function("whisper_.*")
        .allowlist_type("whisper_.*")
        .allowlist_var("WHISPER_.*")
        .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
        .generate()
        .expect("Unable to generate bindings for whisper.cpp. Please ensure the library is properly built.");

    // 将绑定写入 $OUT_DIR/bindings.rs
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("无法写入绑定文件");
    
    // Basic Tauri build configuration
    tauri_build::build()
}
