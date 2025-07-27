use std::env;
use std::path::PathBuf;

fn main() {
    let whisper_cpp_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("lib")
        .join("whisper.cpp");
    let whisper_lib_path = whisper_cpp_path.join("build").join("src");
    let ggml_lib_path = whisper_cpp_path.join("build").join("ggml").join("src");
    let ggml_blas_path = ggml_lib_path.join("ggml-blas");
    let ggml_metal_path = ggml_lib_path.join("ggml-metal");

    println!(
        "cargo:rustc-link-search=native={}",
        whisper_lib_path.display()
    );
    println!(
        "cargo:rustc-link-search=native={}",
        ggml_lib_path.display()
    );
    println!(
        "cargo:rustc-link-search=native={}",
        ggml_blas_path.display()
    );
    println!(
        "cargo:rustc-link-search=native={}",
        ggml_metal_path.display()
    );

    println!("cargo:rustc-link-lib=static=whisper");
    println!("cargo:rustc-link-lib=static=ggml-base");
    println!("cargo:rustc-link-lib=static=ggml-cpu");
    println!("cargo:rustc-link-lib=static=ggml-blas");
    println!("cargo:rustc-link-lib=static=ggml-metal");
    println!("cargo:rustc-link-lib=static=ggml");

    println!("cargo:rustc-link-lib=framework=Foundation");
    println!("cargo:rustc-link-lib=framework=Accelerate");
    println!("cargo:rustc-link-lib=framework=CoreFoundation");
    println!("cargo:rustc-link-lib=framework=CoreGraphics");
    println!("cargo:rustc-link-lib=framework=Metal");
    println!("cargo:rustc-link-lib=c++");

    println!("cargo:rerun-if-changed=build.rs");
    println!(
        "cargo:rerun-if-changed={}/libwhisper.a",
        whisper_lib_path.display()
    );

    // --- FFI 绑定生成 ---
    let header_path = whisper_cpp_path.join("include").join("whisper.h");
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
        .expect("无法生成绑定");

    // 将绑定写入 $OUT_DIR/bindings.rs
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("无法写入绑定文件");
    
    // Basic Tauri build configuration
    tauri_build::build()
}
