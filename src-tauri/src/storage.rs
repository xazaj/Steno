use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::database_manager::DatabaseManager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionRecord {
    pub id: String,
    pub name: String,
    pub original_file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub duration: Option<f64>,
    pub status: String,
    pub progress: f64,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub is_starred: bool,
    pub config: TranscriptionConfig,
    pub result: Option<TranscriptionResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionConfig {
    pub language: String,
    pub mode: String,
    pub audio_enhancement: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub processing_time: f64,
    pub accuracy: Option<f64>,
    pub segments: Option<Vec<TranscriptionSegment>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionSegment {
    pub id: String,
    pub start_time: f64,
    pub end_time: f64,
    pub text: String,
    pub speaker: Option<String>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub content: String,
    pub category: String, // 'general', 'meeting', 'interview', 'medical', 'technical', 'custom'
    pub language: String, // 'zh', 'en', 'auto'
    pub is_built_in: bool,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub usage_count: i32,
    pub is_active: bool,
}

pub struct StorageService {
    conn: Connection,
}

impl StorageService {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        // 使用数据库管理器初始化数据库
        let db_manager = DatabaseManager::new(app_handle)?;
        let conn = db_manager.initialize_database()?;
        
        let storage = Self { conn };
        // 初始化内置提示词（如果需要）
        storage.init_built_in_prompts()?;
        Ok(storage)
    }

    // 数据库初始化现在由 DatabaseManager 处理

    pub fn save_record(&self, record: &TranscriptionRecord) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        // 保存主记录
        tx.execute(
            "INSERT OR REPLACE INTO transcription_records (
                id, name, original_file_name, file_path, file_size, duration,
                status, progress, error_message, created_at, updated_at,
                tags, category, is_starred, config, processing_time, accuracy
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                record.id,
                record.name,
                record.original_file_name,
                record.file_path,
                record.file_size,
                record.duration,
                record.status,
                record.progress,
                record.error_message,
                record.created_at.to_rfc3339(),
                record.updated_at.to_rfc3339(),
                serde_json::to_string(&record.tags).unwrap_or_default(),
                record.category,
                record.is_starred,
                serde_json::to_string(&record.config).unwrap_or_default(),
                record.result.as_ref().map(|r| r.processing_time),
                record.result.as_ref().and_then(|r| r.accuracy),
            ],
        )?;

        // 保存转录内容
        if let Some(result) = &record.result {
            tx.execute(
                "INSERT OR REPLACE INTO transcription_contents (record_id, full_text, segments) 
                 VALUES (?1, ?2, ?3)",
                params![
                    record.id,
                    result.text,
                    result.segments.as_ref()
                        .map(|s| serde_json::to_string(s).unwrap_or_default())
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn get_record(&self, id: &str) -> Result<Option<TranscriptionRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.*, c.full_text, c.segments 
             FROM transcription_records r
             LEFT JOIN transcription_contents c ON r.id = c.record_id
             WHERE r.id = ?1"
        )?;

        let record_iter = stmt.query_map([id], |row| {
            self.row_to_record(row)
        })?;

        for record in record_iter {
            return Ok(Some(record?));
        }

        Ok(None)
    }

    pub fn get_all_records(&self) -> Result<Vec<TranscriptionRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.*, c.full_text, c.segments 
             FROM transcription_records r
             LEFT JOIN transcription_contents c ON r.id = c.record_id
             ORDER BY r.created_at DESC"
        )?;

        let record_iter = stmt.query_map([], |row| {
            self.row_to_record(row)
        })?;

        let mut records = Vec::new();
        for record in record_iter {
            records.push(record?);
        }

        Ok(records)
    }

    pub fn update_record_status(&self, id: &str, status: &str, progress: f64, error: Option<&str>) -> Result<()> {
        self.conn.execute(
            "UPDATE transcription_records 
             SET status = ?1, progress = ?2, error_message = ?3, updated_at = ?4
             WHERE id = ?5",
            params![
                status,
                progress,
                error,
                Utc::now().to_rfc3339(),
                id
            ],
        )?;
        Ok(())
    }

    pub fn update_record_result(&self, id: &str, result: &TranscriptionResult) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        // 更新主记录
        tx.execute(
            "UPDATE transcription_records 
             SET status = 'completed', progress = 100.0, processing_time = ?1, accuracy = ?2, updated_at = ?3
             WHERE id = ?4",
            params![
                result.processing_time,
                result.accuracy,
                Utc::now().to_rfc3339(),
                id
            ],
        )?;

        // 保存转录内容
        tx.execute(
            "INSERT OR REPLACE INTO transcription_contents (record_id, full_text, segments) 
             VALUES (?1, ?2, ?3)",
            params![
                id,
                result.text,
                result.segments.as_ref()
                    .map(|s| serde_json::to_string(s).unwrap_or_default())
            ],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn delete_record(&self, id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        
        tx.execute("DELETE FROM transcription_contents WHERE record_id = ?1", [id])?;
        tx.execute("DELETE FROM transcription_records WHERE id = ?1", [id])?;
        
        tx.commit()?;
        Ok(())
    }

    pub fn toggle_star(&self, id: &str) -> Result<bool> {
        let current_star: bool = self.conn.query_row(
            "SELECT is_starred FROM transcription_records WHERE id = ?1",
            [id],
            |row| row.get(0)
        )?;

        let new_star = !current_star;
        self.conn.execute(
            "UPDATE transcription_records SET is_starred = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_star, Utc::now().to_rfc3339(), id],
        )?;

        Ok(new_star)
    }

    pub fn update_record_name(&self, id: &str, name: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE transcription_records SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    fn row_to_record(&self, row: &rusqlite::Row) -> rusqlite::Result<TranscriptionRecord> {
        let tags_json: String = row.get("tags")?;
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

        let config_json: String = row.get("config")?;
        let config: TranscriptionConfig = serde_json::from_str(&config_json)
            .unwrap_or(TranscriptionConfig {
                language: "auto".to_string(),
                mode: "normal".to_string(),
                audio_enhancement: false,
            });

        let created_at_str: String = row.get("created_at")?;
        let updated_at_str: String = row.get("updated_at")?;

        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());
        let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        // 构建转录结果
        let result = match (row.get::<_, Option<String>>("full_text")?, 
                           row.get::<_, Option<f64>>("processing_time")?) {
            (Some(text), Some(processing_time)) => {
                let segments: Option<Vec<TranscriptionSegment>> = row.get::<_, Option<String>>("segments")?
                    .and_then(|s| serde_json::from_str(&s).ok());

                Some(TranscriptionResult {
                    text,
                    processing_time,
                    accuracy: row.get("accuracy")?,
                    segments,
                })
            },
            _ => None,
        };

        Ok(TranscriptionRecord {
            id: row.get("id")?,
            name: row.get("name")?,
            original_file_name: row.get("original_file_name")?,
            file_path: row.get("file_path")?,
            file_size: row.get("file_size")?,
            duration: row.get("duration")?,
            status: row.get("status")?,
            progress: row.get("progress")?,
            error_message: row.get("error_message")?,
            created_at,
            updated_at,
            tags,
            category: row.get("category")?,
            is_starred: row.get("is_starred")?,
            config,
            result,
        })
    }

    // ========== 提示词管理相关方法 ==========

    /// 初始化内置提示词
    fn init_built_in_prompts(&self) -> Result<()> {
        // 检查是否已经有新的内置提示词，如果有就跳过初始化
        let count: Result<i32, _> = self.conn.query_row(
            "SELECT COUNT(*) FROM prompt_templates WHERE is_built_in = 1 AND id LIKE 'builtin_%'",
            [],
            |row| row.get::<_, i32>(0)
        );
        
        if let Ok(c) = count {
            if c >= 1 {
                // 已经有新的内置提示词，跳过初始化
                return Ok(());
            }
        }
        
        // 删除所有旧的内置提示词，为新的让路
        self.conn.execute(
            "DELETE FROM prompt_templates WHERE is_built_in = 1",
            [],
        )?;
        let built_in_prompts = vec![
            PromptTemplate {
                id: "builtin_banking_universal".to_string(),
                name: "银行业务通用场景".to_string(),
                content: r#"# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明
这是银行业务相关的会议或讨论场景，涵盖贷款业务、存款产品、金融产品设计、用户体验优化、业务模式创新等多个方面，语言风格专业规范，术语丰富。

## 2. 核心术语与专有名词
### 2.1 人名/职位/机构名
* 行长 (President), 副行长 (Vice President), 风控总监 (Chief Risk Officer, CRO)
* 产品经理 (Product Manager), 交互设计师 (UX/UI Designer), 业务分析师 (Business Analyst)
* 中国人民银行 (People's Bank of China, PBOC), 银保监会 (CBIRC), 央行 (Central Bank)
* 工商银行 (ICBC), 建设银行 (CCB), 招商银行 (CMB), 平安银行 (PAB)

### 2.2 业务术语/产品名词
#### 贷款业务
* 个人住房贷款 (Personal Housing Loan), 企业信贷 (Corporate Credit), 消费贷款 (Consumer Loan)
* 抵押贷款 (Mortgage Loan), 信用贷款 (Unsecured Loan), 担保贷款 (Guaranteed Loan)
* 贷款利率 (Loan Interest Rate), 年化利率 (Annual Percentage Rate, APR), 等额本息 (Equal Principal and Interest)
* 风险评级 (Risk Rating), 征信记录 (Credit Record), 还款能力 (Repayment Capacity)

#### 存款产品
* 活期存款 (Demand Deposit), 定期存款 (Time Deposit), 大额存单 (Certificate of Deposit, CD)
* 结构性存款 (Structured Deposit), 智能存款 (Smart Deposit), 通知存款 (Call Deposit)
* 存款准备金率 (Reserve Requirement Ratio, RRR), 存款保险 (Deposit Insurance)

#### 产品设计与交互
* 用户体验 (User Experience, UX), 用户界面 (User Interface, UI), 客户旅程 (Customer Journey)
* 原型设计 (Prototyping), 可用性测试 (Usability Testing), A/B测试 (A/B Testing)
* 移动银行 (Mobile Banking), 网上银行 (Online Banking), 数字化转型 (Digital Transformation)
* 获客成本 (Customer Acquisition Cost, CAC), 客户生命周期价值 (Customer Lifetime Value, CLV)

#### 业务模式与风控
* 零售银行 (Retail Banking), 对公业务 (Corporate Banking), 投资银行 (Investment Banking)
* 普惠金融 (Inclusive Finance), 开放银行 (Open Banking), 金融科技 (FinTech)
* 合规管理 (Compliance Management), 反洗钱 (Anti-Money Laundering, AML), 了解你的客户 (Know Your Customer, KYC)
* 压力测试 (Stress Testing), 资本充足率 (Capital Adequacy Ratio), 不良贷款率 (Non-Performing Loan Ratio, NPL)

### 2.3 特定概念或口头禅
* 以客户为中心 (Customer-centric approach)
* 风险与收益并存 (Risk and return coexist)
* 数据驱动决策 (Data-driven decision making)
* 敏捷响应市场需求 (Agile response to market demands)
* 合规经营，稳健发展 (Compliant operation, steady development)
* 提升用户体验，创造价值 (Enhance user experience and create value)

## 3. 格式化要求示例
* 标点类型: 全角标点
* 分段方式: 问答格式
* 预览效果: 今天的会议很重要，请大家准时参加。

# --- 提示词结束 ---"#.to_string(),
                category: "general".to_string(),
                language: "zh".to_string(),
                is_built_in: true,
                description: Some("适用于银行业务会议、贷款存款业务讨论、产品设计、交互优化、业务模式创新等场景的通用专业提示词".to_string()),
                tags: vec!["银行".to_string(), "金融".to_string(), "贷款".to_string(), "存款".to_string(), "产品设计".to_string(), "交互设计".to_string(), "业务模式".to_string()],
                created_at: Utc::now(),
                updated_at: Utc::now(),
                usage_count: 0,
                is_active: false,
            },
        ];

        // 插入新的内置提示词
        for prompt in built_in_prompts {
            self.save_prompt_template(&prompt)?;
        }

        Ok(())
    }

    /// 保存提示词模板
    pub fn save_prompt_template(&self, prompt: &PromptTemplate) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO prompt_templates (
                id, name, content, category, language, is_built_in, description,
                tags, created_at, updated_at, usage_count, is_active
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                prompt.id,
                prompt.name,
                prompt.content,
                prompt.category,
                prompt.language,
                prompt.is_built_in,
                prompt.description,
                serde_json::to_string(&prompt.tags).unwrap_or_default(),
                prompt.created_at.to_rfc3339(),
                prompt.updated_at.to_rfc3339(),
                prompt.usage_count,
                prompt.is_active,
            ],
        )?;
        Ok(())
    }

    /// 获取所有提示词模板
    pub fn get_prompt_templates(&self) -> Result<Vec<PromptTemplate>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM prompt_templates ORDER BY is_built_in DESC, usage_count DESC, created_at DESC"
        )?;

        let prompt_iter = stmt.query_map([], |row| {
            self.row_to_prompt_template(row)
        })?;

        let mut prompts = Vec::new();
        for prompt in prompt_iter {
            prompts.push(prompt?);
        }

        Ok(prompts)
    }

    /// 根据分类和语言筛选提示词
    pub fn get_prompts_by_filter(&self, category: Option<&str>, language: Option<&str>) -> Result<Vec<PromptTemplate>> {
        let mut query = "SELECT * FROM prompt_templates WHERE 1=1".to_string();
        let mut params: Vec<String> = Vec::new();

        if let Some(cat) = category {
            query.push_str(" AND category = ?");
            params.push(cat.to_string());
        }

        if let Some(lang) = language {
            query.push_str(" AND language = ?");
            params.push(lang.to_string());
        }

        query.push_str(" ORDER BY is_built_in DESC, created_at DESC");

        let mut stmt = self.conn.prepare(&query)?;
        let prompt_iter = stmt.query_map(rusqlite::params_from_iter(params.iter()), |row| {
            self.row_to_prompt_template(row)
        })?;

        let mut prompts = Vec::new();
        for prompt in prompt_iter {
            prompts.push(prompt?);
        }

        Ok(prompts)
    }

    /// 获取单个提示词模板
    pub fn get_prompt_template(&self, id: &str) -> Result<Option<PromptTemplate>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM prompt_templates WHERE id = ?1"
        )?;

        let prompt_iter = stmt.query_map([id], |row| {
            self.row_to_prompt_template(row)
        })?;

        for prompt in prompt_iter {
            return Ok(Some(prompt?));
        }

        Ok(None)
    }

    /// 删除提示词模板（仅限自定义）
    pub fn delete_prompt_template(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM prompt_templates WHERE id = ?1 AND is_built_in = 0",
            [id],
        )?;
        Ok(())
    }

    /// 更新提示词使用次数
    pub fn increment_prompt_usage(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE prompt_templates SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    /// 搜索提示词
    pub fn search_prompt_templates(&self, query: &str) -> Result<Vec<PromptTemplate>> {
        let search_pattern = format!("%{}%", query.to_lowercase());
        let mut stmt = self.conn.prepare(
            "SELECT * FROM prompt_templates 
             WHERE is_active = 1 AND (
                 LOWER(name) LIKE ?1 OR 
                 LOWER(content) LIKE ?1 OR 
                 LOWER(description) LIKE ?1 OR
                 LOWER(tags) LIKE ?1
             )
             ORDER BY is_built_in DESC, usage_count DESC, created_at DESC"
        )?;

        let prompt_iter = stmt.query_map([&search_pattern], |row| {
            self.row_to_prompt_template(row)
        })?;

        let mut prompts = Vec::new();
        for prompt in prompt_iter {
            prompts.push(prompt?);
        }

        Ok(prompts)
    }

    /// 行数据转换为提示词模板
    fn row_to_prompt_template(&self, row: &rusqlite::Row) -> rusqlite::Result<PromptTemplate> {
        let tags_json: String = row.get("tags")?;
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

        let created_at_str: String = row.get("created_at")?;
        let updated_at_str: String = row.get("updated_at")?;

        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());
        let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        Ok(PromptTemplate {
            id: row.get("id")?,
            name: row.get("name")?,
            content: row.get("content")?,
            category: row.get("category")?,
            language: row.get("language")?,
            is_built_in: row.get("is_built_in")?,
            description: row.get("description")?,
            tags,
            created_at,
            updated_at,
            usage_count: row.get("usage_count")?,
            is_active: row.get("is_active")?,
        })
    }
}