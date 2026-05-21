/**
 * 财富流沙盘游戏核心逻辑
 */

// 职业配置
const JOBS = {
    software_engineer: { name: '软件工程师', salary: 15000, expense: 5000, initialCash: 10000, initialAsset: 10000 },
    it_engineer: { name: 'IT工程师', salary: 13000, expense: 4500, initialCash: 8500, initialAsset: 8500 },
    product_manager: { name: '产品经理', salary: 16000, expense: 6000, initialCash: 10000, initialAsset: 10000 },
    doctor: { name: '医生', salary: 20000, expense: 8000, initialCash: 12000, initialAsset: 12000 },
    lawyer: { name: '律师', salary: 18000, expense: 7000, initialCash: 11000, initialAsset: 11000 },
    teacher: { name: '教师', salary: 8000, expense: 3000, initialCash: 5000, initialAsset: 5000 },
    middle_school_teacher: { name: '中学教师', salary: 7500, expense: 2800, initialCash: 4700, initialAsset: 4700 },
    consultant: { name: '咨询师', salary: 14000, expense: 5500, initialCash: 8500, initialAsset: 8500 },
    sales_manager: { name: '销售经理', salary: 12000, expense: 5000, initialCash: 7000, initialAsset: 7000 },
    hr: { name: 'HR', salary: 10000, expense: 4000, initialCash: 6000, initialAsset: 6000 },
    customer_service: { name: '客服', salary: 6000, expense: 2500, initialCash: 3500, initialAsset: 3500 },
    finance: { name: '财务', salary: 11000, expense: 4200, initialCash: 6800, initialAsset: 6800 },
    admin_secretary: { name: '行政秘书', salary: 7000, expense: 2800, initialCash: 4200, initialAsset: 4200 },
    nurse: { name: '护士', salary: 9000, expense: 3500, initialCash: 5500, initialAsset: 5500 },
    artist: { name: '艺术家', salary: 5000, expense: 2000, initialCash: 3000, initialAsset: 3000 },
    entrepreneur: { name: '创业者', salary: 10000, expense: 6000, initialCash: 4000, initialAsset: 4000 }
};

// 棋盘格子类型 (24格循环)
const BOARD_TYPES = ['start', 'normal', 'normal', 'opportunity', 'normal', 
                     'normal', 'adversity', 'normal', 'normal', 'normal', 
                     'settlement', 'normal', 'normal', 'opportunity', 'normal', 
                     'adversity', 'normal', 'normal', 'settlement', 'normal', 
                     'normal', 'opportunity', 'normal', 'normal'];

// 机遇卡库
const OPPORTUNITY_CARDS = [
    { title: '项目奖金', desc: '完成了一个项目，获得额外奖金', effect: () => { addCash(8000); return '获得 ¥8,000'; } },
    { title: '投资收益', desc: '投资收益到账', effect: () => { addCash(5000); addAsset('stocks', 5000); return '获得 ¥5,000 投资收益'; } },
    { title: '房产增值', desc: '你的房产升值了', effect: () => { addPassiveIncome(500); return '被动收入 +¥500/月'; } },
    { title: '兼职收入', desc: '做了一份兼职', effect: () => { addPassiveIncome(800); return '被动收入 +¥800/月'; } },
    { title: '股票分红', desc: '持有的股票分红了', effect: () => { addCash(3000); return '获得 ¥3,000 分红'; } },
    { title: '知识产权', desc: '出售了一项专利', effect: () => { addCash(20000); return '获得 ¥20,000'; } },
    { title: '副业成功', desc: '副业有了稳定收入', effect: () => { addPassiveIncome(1200); return '被动收入 +¥1,200/月'; } },
    { title: '朋友借款', desc: '朋友还钱了', effect: () => { addCash(5000); return '获得 ¥5,000'; } },
    { title: '年终奖', desc: '获得年终奖金', effect: () => { addCash(15000); return '获得 ¥15,000 年终奖'; } },
    { title: '租金收入', desc: '出租房产获得租金', effect: () => { addPassiveIncome(1500); return '被动收入 +¥1,500/月'; } }
];

// 逆流卡库
const ADVERSITY_CARDS = [
    { title: '意外支出', desc: '突发意外需要花钱', effect: () => { deductCash(3000); return '支出 ¥3,000'; } },
    { title: '精力透支', desc: '过度劳累消耗精力', effect: () => { deductEnergy(30); return '精力 -30'; } },
    { title: '失业风险', desc: '公司裁员，暂时失业', effect: () => { setUnemployed(3); return '失业 3 回合（无工资）'; } },
    { title: '医疗支出', desc: '生病需要治疗', effect: () => { deductCash(2000); deductEnergy(20); return '支出 ¥2,000，精力 -20'; } },
    { title: '被骗投资', desc: '投资失败亏损', effect: () => { addLiability(5000); return '增加负债 ¥5,000'; } },
    { title: '汽车维修', desc: '车子坏了需要维修', effect: () => { deductCash(4000); return '支出 ¥4,000'; } },
    { title: '信用卡逾期', desc: '信用卡还款逾期', effect: () => { addLiability(2000); return '增加负债 ¥2,000'; } },
    { title: '人情支出', desc: '随份子钱', effect: () => { deductCash(1500); return '支出 ¥1,500'; } },
    { title: '被骗', desc: '遇到诈骗', effect: () => { deductCash(6000); return '损失 ¥6,000'; } },
    { title: '贷款利息', desc: '贷款利息支出', effect: () => { deductCash(1000); return '支出利息 ¥1,000'; } }
];

// LocalStorage 键名
const STORAGE_KEY = 'wealthFlowPlayerData';

// 获取玩家数据
function getPlayerData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        return JSON.parse(data);
    }
    return null;
}

// 保存玩家数据
function savePlayerData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 初始化玩家数据
function initPlayerData(jobKey) {
    const job = JOBS[jobKey];
    const data = {
        job: jobKey,
        jobName: job.name,
        age: 20,
        year: new Date().getFullYear(),
        energy: 100,
        salary: job.salary,
        fixedExpense: job.expense,
        passiveIncome: 0,
        cash: job.initialCash,
        totalAsset: job.initialAsset,
        totalLiability: 0,
        loan: 0,
        position: 0,
        round: 1,
        maxPassiveIncome: 0,
        isUnemployed: false,
        unemployedRounds: 0,
        assets: {
            cash: job.initialCash,
            property: 0,
            stocks: 0,
            business: 0,
            sideJob: 0
        }
    };
    savePlayerData(data);
    return data;
}

// 重置游戏
function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
}

// ==================== 数值操作函数 ====================

function addCash(amount) {
    const data = getPlayerData();
    if (data) {
        data.cash += amount;
        data.assets.cash = data.cash;
        data.totalAsset = data.assets.cash + data.assets.property + 
                          data.assets.stocks + data.assets.business + data.assets.sideJob;
        savePlayerData(data);
    }
}

function deductCash(amount) {
    const data = getPlayerData();
    if (data) {
        const deducted = Math.min(data.cash, amount);
        data.cash -= deducted;
        if (amount > deducted) {
            // 现金不够，从资产扣除
            const remaining = amount - deducted;
            data.totalLiability += remaining;
            data.loan += remaining;
        }
        data.assets.cash = data.cash;
        data.totalAsset = data.assets.cash + data.assets.property + 
                          data.assets.stocks + data.assets.business + data.assets.sideJob;
        savePlayerData(data);
    }
}

function addPassiveIncome(amount) {
    const data = getPlayerData();
    if (data) {
        data.passiveIncome += amount;
        data.maxPassiveIncome = Math.max(data.maxPassiveIncome, data.passiveIncome);
        savePlayerData(data);
    }
}

function deductPassiveIncome(amount) {
    const data = getPlayerData();
    if (data) {
        data.passiveIncome = Math.max(0, data.passiveIncome - amount);
        savePlayerData(data);
    }
}

function addEnergy(amount) {
    const data = getPlayerData();
    if (data) {
        data.energy = Math.min(100, data.energy + amount);
        savePlayerData(data);
    }
}

function deductEnergy(amount) {
    const data = getPlayerData();
    if (data) {
        data.energy = Math.max(0, data.energy - amount);
        savePlayerData(data);
    }
}

function addLiability(amount) {
    const data = getPlayerData();
    if (data) {
        data.totalLiability += amount;
        data.loan += amount;
        savePlayerData(data);
    }
}

function reduceLiability(amount) {
    const data = getPlayerData();
    if (data && data.loan >= amount && data.cash >= amount) {
        data.loan -= amount;
        data.totalLiability -= amount;
        data.cash -= amount;
        data.assets.cash = data.cash;
        data.totalAsset = data.assets.cash + data.assets.property + 
                          data.assets.stocks + data.assets.business + data.assets.sideJob;
        savePlayerData(data);
    }
}

function addAsset(type, amount) {
    const data = getPlayerData();
    if (data && data.assets.hasOwnProperty(type)) {
        data.assets[type] += amount;
        data.totalAsset = data.assets.cash + data.assets.property + 
                          data.assets.stocks + data.assets.business + data.assets.sideJob;
        savePlayerData(data);
    }
}

function sellAsset(type, amount) {
    const data = getPlayerData();
    if (data && data.assets.hasOwnProperty(type) && data.assets[type] >= amount) {
        data.assets[type] -= amount;
        data.cash += amount;
        data.assets.cash = data.cash;
        data.totalAsset = data.assets.cash + data.assets.property + 
                          data.assets.stocks + data.assets.business + data.assets.sideJob;
        savePlayerData(data);
    }
}

function setUnemployed(rounds) {
    const data = getPlayerData();
    if (data) {
        data.isUnemployed = true;
        data.unemployedRounds = rounds;
        savePlayerData(data);
    }
}

// ==================== 游戏核心逻辑 ====================

// 可覆盖的提示函数（页面中可替换为自定义弹窗）
let showAlert = function(msg) { alert(msg); };

// 掷骰子
function rollDice() {
    const data = getPlayerData();
    if (!data) return null;
    
    if (data.energy <= 0) {
        showAlert('精力值为0，无法操作！请先增加精力。');
        return null;
    }
    
    const dice = Math.floor(Math.random() * 6) + 1;
    
    // 只扣除精力，不移动位置（位置由动画逐格更新）
    data.energy = Math.max(0, data.energy - 10);
    data.round++;
    
    // 每12回合年龄+1
    if (data.round > 1 && (data.round - 1) % 12 === 0) {
        data.age++;
        data.year++;
    }
    
    // 处理失业状态
    if (data.isUnemployed) {
        data.unemployedRounds--;
        if (data.unemployedRounds <= 0) {
            data.isUnemployed = false;
        }
    }
    
    // 计算目标位置（不保存，由动画逐格更新）
    const targetPosition = (data.position + dice) % 24;
    const targetType = BOARD_TYPES[targetPosition];
    
    // 保存除position外的数据
    savePlayerData(data);
    
    return {
        dice,
        position: targetPosition,
        type: targetType
    };
}

// 获取月度现金流
function getMonthlyCashflow() {
    const data = getPlayerData();
    if (!data) return 0;
    
    const income = data.isUnemployed ? 0 : data.salary;
    return income + data.passiveIncome - data.fixedExpense;
}

// 月度结算
function monthlySettlement() {
    const data = getPlayerData();
    if (!data) return;
    
    const cashflow = getMonthlyCashflow();
    data.cash += cashflow;
    data.assets.cash = data.cash;
    data.round++;
    
    // 每12回合年龄+1
    if ((data.round - 1) % 12 === 0) {
        data.age++;
        data.year++;
    }
    
    data.totalAsset = data.assets.cash + data.assets.property + 
                      data.assets.stocks + data.assets.business + data.assets.sideJob;
    savePlayerData(data);
}

// 增加精力
function increaseEnergy() {
    const data = getPlayerData();
    if (!data) return;
    
    addEnergy(50);
}

// 检查财务自由
function checkFinancialFreedom() {
    const data = getPlayerData();
    if (!data) return false;
    
    return data.passiveIncome >= data.fixedExpense;
}

// 检查是否60岁
function checkRetirement() {
    const data = getPlayerData();
    if (!data) return false;
    
    return data.age >= 60;
}

// 检查净资产
function checkNetAsset() {
    const data = getPlayerData();
    if (!data) return 0;
    
    return data.totalAsset - data.totalLiability;
}

// 抽取机遇卡
function drawOpportunityCard() {
    const data = getPlayerData();
    if (!data) return null;
    
    if (data.energy <= 0) {
        showAlert('精力值为0，无法操作！请先增加精力。');
        return null;
    }
    
    // 先扣除精力并保存
    data.energy = Math.max(0, data.energy - 5);
    savePlayerData(data);
    
    const cardIndex = Math.floor(Math.random() * OPPORTUNITY_CARDS.length);
    const card = OPPORTUNITY_CARDS[cardIndex];
    const result = card.effect();
    
    // effect()已经通过addCash等函数更新了localStorage，重新读取并更新maxPassiveIncome
    const updatedData = getPlayerData();
    updatedData.maxPassiveIncome = Math.max(updatedData.maxPassiveIncome, updatedData.passiveIncome);
    savePlayerData(updatedData);
    
    return { ...card, result };
}

// 抽取逆流卡
function drawAdversityCard() {
    const data = getPlayerData();
    if (!data) return null;
    
    if (data.energy <= 0) {
        showAlert('精力值为0，无法操作！请先增加精力。');
        return null;
    }
    
    // 先扣除精力
    data.energy = Math.max(0, data.energy - 5);
    savePlayerData(data);
    
    const cardIndex = Math.floor(Math.random() * ADVERSITY_CARDS.length);
    const card = ADVERSITY_CARDS[cardIndex];
    const result = card.effect();
    
    // effect()已经通过deductCash等函数更新了localStorage，无需再save
    return { ...card, result };
}

// 获取格子类型名称
function getBoardTypeName(type) {
    const names = {
        'start': '起点',
        'normal': '普通格',
        'opportunity': '机遇格',
        'adversity': '逆流格',
        'settlement': '结算日'
    };
    return names[type] || '普通格';
}

// 投资项目（简化版）
function investProject(amount) {
    const data = getPlayerData();
    if (!data || data.cash < amount) {
        showAlert('现金不足！');
        return false;
    }
    
    data.cash -= amount;
    data.assets.cash = data.cash;
    data.totalAsset = data.assets.cash + data.assets.property + 
                      data.assets.stocks + data.assets.business + data.assets.sideJob;
    data.passiveIncome += Math.floor(amount * 0.005); // 0.5% 月收益
    data.maxPassiveIncome = Math.max(data.maxPassiveIncome, data.passiveIncome);
    savePlayerData(data);
    return true;
}

// 银行贷款
function takeLoan(amount) {
    const data = getPlayerData();
    if (!data) return false;
    
    data.totalLiability += amount;
    data.loan += amount;
    data.cash += amount;
    data.assets.cash = data.cash;
    data.totalAsset = data.assets.cash + data.assets.property + 
                      data.assets.stocks + data.assets.business + data.assets.sideJob;
    savePlayerData(data);
    return true;
}

// 还贷款
function repayLoan(amount) {
    const data = getPlayerData();
    if (!data || data.loan < amount || data.cash < amount) {
        showAlert('无法还款，请检查贷款金额和现金余额！');
        return false;
    }
    
    data.loan -= amount;
    data.totalLiability -= amount;
    data.cash -= amount;
    data.assets.cash = data.cash;
    data.totalAsset = data.assets.cash + data.assets.property + 
                      data.assets.stocks + data.assets.business + data.assets.sideJob;
    savePlayerData(data);
    return true;
}

// 购买资产
function buyAsset(type, amount) {
    const data = getPlayerData();
    if (!data || data.cash < amount) {
        showAlert('现金不足！');
        return false;
    }
    
    data.cash -= amount;
    data.assets.cash = data.cash;
    data.assets[type] += amount;
    data.totalAsset = data.assets.cash + data.assets.property + 
                      data.assets.stocks + data.assets.business + data.assets.sideJob;
    savePlayerData(data);
    return true;
}

// 出售资产
function doSellAsset(type, amount) {
    const data = getPlayerData();
    if (!data || data.assets[type] < amount) {
        showAlert('资产不足！');
        return false;
    }
    
    data.assets[type] -= amount;
    data.cash += amount;
    data.assets.cash = data.cash;
    data.totalAsset = data.assets.cash + data.assets.property + 
                      data.assets.stocks + data.assets.business + data.assets.sideJob;
    savePlayerData(data);
    return true;
}

// 格式化金额
function formatMoney(amount) {
    return '¥' + amount.toLocaleString();
}
