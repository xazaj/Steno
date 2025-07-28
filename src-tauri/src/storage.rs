use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use tauri::Manager;
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
            if c >= 6 {
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
                id: "builtin_finance_investment".to_string(),
                name: "金融投资策略会议".to_string(),
                content: r#"# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明
这是一场关于全球宏观经济形势的季度投资策略电话会议，内容聚焦于利率政策、市场风险和资产配置，语言风格专业、数据驱动。

## 2. 核心术语与专有名词
### 2.1 人名/机构名/产品名
* 鲍威尔 (Jerome Powell), 耶伦 (Janet Yellen)
* 美联储 (The Federal Reserve, The Fed), 欧洲央行 (ECB), 高盛 (Goldman Sachs), 摩根士丹利 (Morgan Stanley)
* 纳斯达克指数 (NASDAQ), 标普500指数 (S&P 500)
* 交易所交易基金 (Exchange-Traded Fund, ETF), 量化对冲基金 (Quantitative Hedge Fund)

### 2.2 行业术语/专业词汇
* 量化宽松 (Quantitative Easing, QE), 缩减购债 (Tapering), 加息周期 (Rate Hike Cycle)
* 收益率曲线 (Yield Curve), 通货膨胀 (Inflation), 通货紧缩 (Deflation)
* 阿尔法收益 (Alpha), 贝塔系数 (Beta), 夏普比率 (Sharpe Ratio)
* 宏观经济 (Macroeconomics), 非农就业数据 (Non-Farm Payrolls, NFP)
* 风险敞口 (Risk Exposure), 黑天鹅事件 (Black Swan Event)

### 2.3 特定概念或口头禅
* 穿越牛熊周期 (To navigate through bull and bear cycles)
* 市场的非理性繁荣 (Irrational exuberance of the market)
* 寻求结构性机会 (Seeking structural opportunities)

## 3. 格式化要求示例
* 标点类型: 全角标点
* 分段方式: 问答格式
* 预览效果: 今天的会议很重要，请大家准时参加。

# --- 提示词结束 ---"#.to_string(),
                category: "general".to_string(),
                language: "zh".to_string(),
                is_built_in: true,
                description: Some("适用于金融行业投资策略会议、财经分析等场景的专业提示词".to_string()),
                tags: vec!["金融".to_string(), "投资".to_string(), "宏观经济".to_string(), "资产配置".to_string()],
                created_at: Utc::now(),
                updated_at: Utc::now(),
                usage_count: 0,
                is_active: false,
            },
            PromptTemplate {
                id: "builtin_medical_clinical".to_string(),
                name: "医疗临床研究会议".to_string(),
                content: r#"# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明
这是一场关于新型抗肿瘤药物 KL-281 的三期临床试验数据揭盲和研讨会，内容涉及药代动力学、疗效与安全性，术语非常专业。

## 2. 核心术语与专有名词
### 2.1 人名/机构名/产品名
* 李明博士 (Dr. Li Ming), 临床研究负责人 (Principal Investigator, PI)
* 辉瑞 (Pfizer), 阿斯利康 (AstraZeneca)
* 美国食品药品监督管理局 (Food and Drug Administration, FDA), 国家药品监督管理局 (NMPA)
* 泰瑞沙 (Tagrisso), 可瑞达 (Keytruda, K药)

### 2.2 行业术语/专业词汇
* 临床试验 (Clinical Trial), 双盲随机对照试验 (Double-Blind Randomized Controlled Trial, RCT)
* 肿瘤免疫学 (Immuno-Oncology), 靶向治疗 (Targeted Therapy), 细胞凋亡 (Apoptosis)
* 总生存期 (Overall Survival, OS), 无进展生存期 (Progression-Free Survival, PFS)
* 药代动力学 (Pharmacokinetics, PK), 药效学 (Pharmacodynamics, PD)
* 不良事件 (Adverse Event, AE), 适应症 (Indication)

### 2.3 特定概念或口头禅
* 改善患者预后 (To improve patient outcomes)
* 具有统计学显著性差异 (Statistically significant difference)
* 安全性和耐受性良好 (Good safety and tolerability profile)

## 3. 格式化要求示例
* 标点类型: 全角标点
* 分段方式: 问答格式
* 预览效果: 今天的会议很重要，请大家准时参加。

# --- 提示词结束 ---"#.to_string(),
                category: "medical".to_string(),
                language: "zh".to_string(),
                is_built_in: true,
                description: Some("适用于医疗健康行业的临床研究、药物开发等专业会议场景".to_string()),
                tags: vec!["医疗".to_string(), "临床试验".to_string(), "药物研发".to_string(), "生物医学".to_string()],
                created_at: Utc::now(),
                updated_at: Utc::now(),
                usage_count: 0,
                is_active: false,
            },
            PromptTemplate {
                id: "builtin_ai_tech_forum".to_string(),
                name: "AI技术伦理论坛".to_string(),
                content: r#"# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明
这是一场关于多模态大语言模型技术伦理与对齐方法的高峰论坛，内容围绕模型的可解释性和安全性展开，技术概念密集。

## 2. 核心术语与专有名词
### 2.1 人名/机构名/产品名
* 杨立昆 (Yann LeCun), 吴恩达 (Andrew Ng)
* OpenAI, DeepMind, Anthropic, Hugging Face
* GPT-4 (Generative Pre-trained Transformer 4), Gemini, LLaMA (Large Language Model Meta AI)
* Transformer架构, PyTorch, TensorFlow

### 2.2 行业术语/专业词汇
* 大语言模型 (Large Language Model, LLM), 多模态 (Multimodal)
* 生成式对抗网络 (Generative Adversarial Network, GAN)
* 从人类反馈中强化学习 (Reinforcement Learning from Human Feedback, RLHF)
* 模型幻觉 (Hallucination), 模型对齐 (Model Alignment), 可解释性AI (Explainable AI, XAI)
* 提示词工程 (Prompt Engineering), 微调 (Fine-tuning), 推理 (Inference)

### 2.3 特定概念或口头禅
* 涌现能力 (Emergent Abilities)
* 负责任的人工智能 (Responsible AI)
* 通用人工智能 (Artificial General Intelligence, AGI)

## 3. 格式化要求示例
* 标点类型: 全角标点
* 分段方式: 问答格式
* 预览效果: 今天的会议很重要，请大家准时参加。

# --- 提示词结束 ---"#.to_string(),
                category: "technical".to_string(),
                language: "zh".to_string(),
                is_built_in: true,
                description: Some("适用于人工智能、机器学习技术讨论和学术论坛等场景".to_string()),
                tags: vec!["AI".to_string(), "机器学习".to_string(), "大语言模型".to_string(), "技术伦理".to_string()],
                created_at: Utc::now(),
                updated_at: Utc::now(),
                usage_count: 0,
                is_active: false,
            },
            PromptTemplate {
                id: "builtin_nba_analysis".to_string(),
                name: "NBA赛后复盘分析".to_string(),
                content: r#"# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明
这是一场关于 NBA 季后赛关键场次的赛后复盘分析直播节目，包含大量篮球战术术语、球员昵称和高语速评论。

## 2. 核心术语与专有名词
### 2.1 人名/机构名/产品名
* 勒布朗·詹姆斯 (LeBron James), 斯蒂芬·库里 (Stephen Curry), 约基奇 (Nikola Jokić)
* 洛杉矶湖人队 (Los Angeles Lakers), 金州勇士队 (Golden State Warriors)
* NBA (National Basketball Association), 国际篮联 (FIBA)
* ESPN, TNT

### 2.2 行业术语/专业词汇
* 挡拆战术 (Pick and Roll), 无球跑动 (Off-ball movement), 全场紧逼 (Full-court press)
* 攻防转换 (Transition offense/defense), 低位单打 (Post-up)
* 三分球 (Three-pointer), 罚球 (Free throw), 盖帽 (Block), 抢断 (Steal)
* 常规赛最有价值球员 (Most Valuable Player, MVP), 总决赛 (The Finals)

### 2.3 特定概念或口头禅
* 打出了统治级的表现 (Delivered a dominant performance)
* 关键时刻的英雄球 (Clutch shot in the crucial moment)
* 防守赢得总冠军 (Defense wins championships)

## 3. 格式化要求示例
* 标点类型: 全角标点
* 分段方式: 问答格式
* 预览效果: 今天的会议很重要，请大家准时参加。

# --- 提示词结束 ---"#.to_string(),
                category: "general".to_string(),
                language: "zh".to_string(),
                is_built_in: true,
                description: Some("适用于体育赛事解说、赛后分析和体育节目等场景".to_string()),
                tags: vec!["体育".to_string(), "NBA".to_string(), "篮球".to_string(), "赛事解说".to_string()],
                created_at: Utc::now(),
                updated_at: Utc::now(),
                usage_count: 0,
                is_active: false,
            },
            PromptTemplate {
                id: "builtin_k12_education".to_string(),
                name: "K12教育改革研讨会".to_string(),
                content: r#"# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明
这是一场关于K12阶段教育改革与未来核心素养培养的学术研讨会，内容探讨混合式教学与评价体系创新，教育理论词汇较多。

## 2. 核心术语与专有名词
### 2.1 人名/机构名/产品名
* 杜威 (John Dewey), 皮亚杰 (Jean Piaget), 维果茨基 (Lev Vygotsky)
* 北京师范大学 (Beijing Normal University), 可汗学院 (Khan Academy), Coursera
* PISA测试 (Programme for International Student Assessment)
* 部编版教材

### 2.2 行业术语/专业词汇
* 核心素养 (Core Competencies), 批判性思维 (Critical Thinking)
* 探究式学习 (Inquiry-Based Learning), 项目制学习 (Project-Based Learning, PBL)
* 混合式教学 (Blended Learning), 翻转课堂 (Flipped Classroom)
* 形成性评价 (Formative Assessment), 终结性评价 (Summative Assessment)
* 素质教育 (Holistic Education), 因材施教 (Personalized education)

### 2.3 特定概念或口头禅
* 以学生为中心 (Student-centered approach)
* 培养终身学习者 (Cultivating lifelong learners)
* 打破学科壁垒 (Breaking down subject silos)

## 3. 格式化要求示例
* 标点类型: 全角标点
* 分段方式: 问答格式
* 预览效果: 今天的会议很重要，请大家准时参加。

# --- 提示词结束 ---"#.to_string(),
                category: "general".to_string(),
                language: "zh".to_string(),
                is_built_in: true,
                description: Some("适用于教育行业的学术研讨、教学改革和素养培养等场景".to_string()),
                tags: vec!["教育".to_string(), "K12".to_string(), "教学改革".to_string(), "核心素养".to_string()],
                created_at: Utc::now(),
                updated_at: Utc::now(),
                usage_count: 0,
                is_active: false,
            },
            PromptTemplate {
                id: "builtin_business_meeting".to_string(),
                name: "通用商务项目会议".to_string(),
                content: r#"# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明
这是一次跨部门的公司项目周会，内容主要是同步项目进展、讨论现有问题和明确下一步行动计划，语言风格为商务会话。

## 2. 核心术语与专有名词
### 2.1 人名/机构名/产品名
* 张三 (Zhang San), 李四 (Li Si), 项目经理 (Project Manager), 产品负责人 (Product Owner)
* 市场部 (Marketing Dept.), 研发部 (R&D Dept.), 财务部 (Finance Dept.)
* Zoom, Microsoft Teams, Slack, Jira, Confluence

### 2.2 行业术语/专业词汇
* 关键绩效指标 (Key Performance Indicator, KPI), 投资回报率 (Return on Investment, ROI)
* 利益相关者 (Stakeholders), 里程碑 (Milestone), 可交付成果 (Deliverables)
* 路线图 (Roadmap), 时间线 (Timeline), 瓶颈 (Bottleneck)
* 复盘 (Review), 头脑风暴 (Brainstorming), 协同效应 (Synergy)
* 敏捷开发 (Agile Development), 瀑布模型 (Waterfall Model)

### 2.3 特定概念或口头禅
* 我们对齐一下信息 (Let's align on this / Let's sync up)
* 确保这个事情形成闭环 (Ensure this issue is closed-loop)
* 下一步的行动点是什么 (What are the next action items?)

## 3. 格式化要求示例
* 标点类型: 全角标点
* 分段方式: 问答格式
* 预览效果: 今天的会议很重要，请大家准时参加。

# --- 提示词结束 ---"#.to_string(),
                category: "meeting".to_string(),
                language: "zh".to_string(),
                is_built_in: true,
                description: Some("适用于通用商务会议、项目讨论和跨部门协作等场景".to_string()),
                tags: vec!["商务".to_string(), "项目管理".to_string(), "会议".to_string(), "协作".to_string()],
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