/**
 * 财富流沙盘游戏核心逻辑 - 正式规则版
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

// 棋盘格子类型 (24格循环) - 保持不变
const BOARD_TYPES = ['start', 'normal', 'normal', 'opportunity', 'normal', 
                     'normal', 'adversity', 'normal', 'normal', 'normal', 
                     'settlement', 'normal', 'normal', 'opportunity', 'normal', 
                     'adversity', 'normal', 'normal', 'settlement', 'normal', 
                     'normal', 'opportunity', 'normal', 'normal'];

// 机遇卡库（含人生事件）
const OPPORTUNITY_CARDS = [
    { title: '项目奖金', desc: '完成了一个项目，获得额外奖金', effect: () => { addCash(8000); return '获得 ¥8,000'; } },
    { title: '投资收益', desc: '投资收益到账', effect: () => { addCash(5000); addAsset('stocks', 5000); return '获得 ¥5,000 投资收益'; } },
    { title: '房产增值', desc: '持有房产升值，租金增加', effect: () => { addPassiveIncome(500); return '被动收入 +¥500/月'; } },
    { title: '兼职收入', desc: '做了一份兼职', effect: () => { addPassiveIncome(800); return '被动收入 +¥800/月'; } },
    { title: '股票分红', desc: '持有的股票分红了', effect: () => { addCash(3000); return '获得 ¥3,000 分红'; } },
    { title: '知识产权', desc: '出售了一项专利', effect: () => { addCash(20000); return '获得 ¥20,000'; } },
    { title: '副业成功', desc: '副业有了稳定收入', effect: () => { addPassiveIncome(1200); return '被动收入 +¥1,200/月'; } },
    { title: '朋友还款', desc: '朋友还钱了', effect: () => { addCash(5000); return '获得 ¥5,000'; } },
    { title: '年终奖', desc: '获得年终奖金', effect: () => { addCash(15000); return '获得 ¥15,000 年终奖'; } },
    { title: '租金收入', desc: '出租房产获得租金', effect: () => { addPassiveIncome(1500); return '被动收入 +¥1,500/月'; } },
    { title: '结婚喜事', desc: '步入婚姻殿堂', effect: () => { const d=getPlayerData();if(d.married)return'已结婚，此卡无效';d.married=true;d.fixedExpense+=2000;savePlayerData(d);return'结婚！月支出 +¥2,000'; } },
    { title: '喜得贵子', desc: '家庭喜添新成员', effect: () => { const d=getPlayerData();if(d.children>=3)return'子女已满3人';d.children++;d.fixedExpense+=1500;savePlayerData(d);return'生子！月支出+¥1,500，子女'+d.children+'人'; } },
    { title: '加薪升职', desc: '升职加薪', effect: () => { const d=getPlayerData();d.salary=Math.round(d.salary*1.2);savePlayerData(d);return'工资+20% → ¥'+d.salary.toLocaleString()+'/月'; } },
];

// 逆流卡库（含人生事件 - 遵循环规则，无罚款）
const ADVERSITY_CARDS = [
    { title: '意外支出', desc: '突发意外需要花钱', effect: () => { const d=getPlayerData();let a=3000;if(d.insurance>0)a=Math.ceil(a/2);deductCash(a);return'支出 ¥'+a.toLocaleString()+(d.insurance>0?' (保险减半)':''); } },
    { title: '精力透支', desc: '过度劳累消耗精力', effect: () => { const d=getPlayerData();let a=30;if(d.insurance>0)a=Math.ceil(a/2);deductEnergy(a);return'精力 -'+a+(d.insurance>0?' (保险减半)':''); } },
    { title: '失业裁员', desc: '公司裁员，暂时失业', effect: () => { setUnemployed(3); return '失业 3 回合（无工资），进入逆流层'; } },
    { title: '医疗支出', desc: '生病需要治疗', effect: () => { const d=getPlayerData();let c=2000,e=20;if(d.insurance>0){c=Math.ceil(c/2);e=Math.ceil(e/2)}deductCash(c);deductEnergy(e);return'支出¥'+c+'，精力-'+e+(d.insurance>0?' (保险)':''); } },
    { title: '投资失败', desc: '投资失败亏损', effect: () => { addLiability(5000); return '增加负债 ¥5,000'; } },
    { title: '汽车维修', desc: '汽车损坏需要维修', effect: () => { const d=getPlayerData();let a=4000;if(d.insurance>0)a=Math.ceil(a/2);deductCash(a);return'支出 ¥'+a.toLocaleString()+(d.insurance>0?' (保险减半)':''); } },
    { title: '信用卡逾期', desc: '信用卡还款逾期', effect: () => { addLiability(2000); return '增加负债 ¥2,000'; } },
    { title: '人情支出', desc: '随份子钱', effect: () => { deductCash(1500); return '支出 ¥1,500'; } },
    { title: '遭遇诈骗', desc: '遇到诈骗损失', effect: () => { const d=getPlayerData();let a=6000;if(d.insurance>0)a=Math.ceil(a/2);deductCash(a);return'损失 ¥'+a.toLocaleString()+(d.insurance>0?' (保险减半)':''); } },
    { title: '离婚', desc: '婚姻破裂', effect: () => { const d=getPlayerData();if(!d.married)return'未婚，此卡无效';d.married=false;d.fixedExpense=Math.max(0,d.fixedExpense-1000);deductCash(10000);savePlayerData(d);return'离婚！支出¥10,000，月支出-¥1,000'; } },
];

// LocalStorage 键名
const STORAGE_KEY = 'wealthFlowPlayerData';

// 获取玩家数据（兼容旧版迁移）
function getPlayerData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        const d = JSON.parse(data);
        // 迁移：补充新字段
        if (d.layer === undefined) d.layer = 'normal';
        if (d.adversityRounds === undefined) d.adversityRounds = 0;
        if (d.charity === undefined) d.charity = 0;
        if (d.married === undefined) d.married = false;
        if (d.children === undefined) d.children = 0;
        if (d.insurance === undefined) d.insurance = 0;
        if (d.dreamAchieved === undefined) d.dreamAchieved = false;
        if (d.maxEnergy === undefined) d.maxEnergy = 100;
        return d;
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
        maxEnergy: 100,
        salary: job.salary,
        fixedExpense: job.expense,
        passiveIncome: 0,
        cash: job.initialCash,
        totalAsset: job.initialAsset,
        totalLiability: 0,
        loan: 0,
        position: 0,
        round: 1,
        layer: 'normal',
        adversityRounds: 0,
        maxPassiveIncome: 0,
        isUnemployed: false,
        unemployedRounds: 0,
        married: false,
        children: 0,
        charity: 0,
        insurance: 0,
        dreamAchieved: false,
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
        data.energy = Math.min(data.maxEnergy, data.energy + amount);
        savePlayerData(data);
    }
}

function deductEnergy(amount) {
    const data = getPlayerData();
    if (data) {
        data.energy -= amount;
        savePlayerData(data);
        // 不在这里判死，让调用方检查
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

function addAsset(type, amount) {
    const data = getPlayerData();
    if (data && data.assets.hasOwnProperty(type)) {
        data.assets[type] += amount;
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
        data.layer = 'adversity'; // 失业触发逆流层
        data.adversityRounds = 0;
        savePlayerData(data);
    }
}

// ==================== 游戏核心逻辑 ====================

let showAlert = function(msg) { alert(msg); };

// 获取月总支出（含贷款利息）
function getTotalExpense(d) {
    return d.fixedExpense + Math.floor(d.loan * 0.05);
}

// 掷骰子
function rollDice() {
    const data = getPlayerData();
    if (!data) return null;
    
    if (data.energy <= 0) {
        showAlert('精力值为0，无法操作！请先休息增加精力。');
        return null;
    }
    
    const dice = Math.floor(Math.random() * 6) + 1;
    
    data.energy = Math.max(-5, data.energy - 10); // 允许降到负数（卡牌效果）
    data.round++;
    
    // 年龄推进
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
    
    // 保险递减
    if (data.insurance > 0) {
        data.insurance--;
    }
    
    const targetPosition = (data.position + dice) % 24;
    const targetType = BOARD_TYPES[targetPosition];
    
    savePlayerData(data);
    
    return { dice, position: targetPosition, type: targetType };
}

// 获取月度现金流（含贷款月供）
function getMonthlyCashflow() {
    const data = getPlayerData();
    if (!data) return 0;
    const income = data.isUnemployed ? 0 : data.salary;
    return income + data.passiveIncome - getTotalExpense(data);
}

// 月度结算
function monthlySettlement() {
    const data = getPlayerData();
    if (!data) return;
    
    const cashflow = getMonthlyCashflow();
    data.cash += cashflow;
    data.assets.cash = data.cash;
    data.round++;
    
    // 年龄推进
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

// ==================== 层级与胜利条件 ====================

// 检查并更新层级
function checkLayer() {
    const data = getPlayerData();
    if (!data) return null;
    
    const prevLayer = data.layer;
    const totalExp = getTotalExpense(data);
    
    // 顺流层判定：被动收入 >= 总支出 且 无银行贷款
    if (data.passiveIncome >= totalExp && data.loan === 0) {
        if (data.layer !== 'prosperity') {
            data.layer = 'prosperity';
            data.adversityRounds = 0;
            savePlayerData(data);
            return 'enter_prosperity';
        }
    }
    // 顺流层回落：被动收入降至总支出以下 或 新增贷款
    else if (data.layer === 'prosperity') {
        if (data.passiveIncome < totalExp || data.loan > 0) {
            data.layer = 'normal';
            savePlayerData(data);
            return 'fallback_normal';
        }
    }
    // 逆流层恢复：连续3回合无新打击 且 非失业
    else if (data.layer === 'adversity') {
        data.adversityRounds = (data.adversityRounds || 0) + 1;
        if (data.adversityRounds >= 3 && !data.isUnemployed) {
            data.layer = 'normal';
            data.adversityRounds = 0;
            savePlayerData(data);
            return 'recover_normal';
        }
    }
    
    if (data.layer !== 'adversity') {
        data.adversityRounds = 0;
    }
    
    if (prevLayer !== data.layer) savePlayerData(data);
    return prevLayer !== data.layer ? 'changed' : null;
}

// 检查胜利条件，返回胜利类型或null
function checkVictory() {
    const data = getPlayerData();
    if (!data) return null;
    
    // 梦想家：顺流层 + 无贷款 + 实现梦想
    if (data.layer === 'prosperity' && data.loan === 0 && data.dreamAchieved) {
        return 'dreamer';
    }
    // 慈善家：慈善累计 >= 1000万
    if (data.charity >= 10000000) {
        return 'philanthropist';
    }
    // 创富家：总资产 >= 1亿 + 无贷款
    if (data.totalAsset >= 100000000 && data.loan === 0) {
        return 'tycoon';
    }
    // 60岁退休
    if (data.age >= 60) {
        return 'retired';
    }
    // 精力透支出局
    if (data.energy <= -2) {
        return 'energy_depleted';
    }
    return null;
}

// 检查5岁钟声提醒
function checkAgeBell(prevAge, newAge) {
    for (let a = prevAge + 1; a <= newAge; a++) {
        if (a % 5 === 0) return a;
    }
    return null;
}

// 检查是否经过结算格（路过触发）
function checkPassSettlement(oldPos, newPos) {
    // 24格棋盘：结算格在 index 10 和 18
    const settlements = [10, 18];
    let passed = false;
    // 正向移动时检查
    if (newPos >= oldPos) {
        for (let p = oldPos + 1; p <= newPos; p++) {
            if (settlements.includes(p)) passed = true;
        }
    } else {
        // 穿过棋盘末尾回到开头
        for (let p = oldPos + 1; p < 24; p++) {
            if (settlements.includes(p)) passed = true;
        }
        for (let p = 0; p <= newPos; p++) {
            if (settlements.includes(p)) passed = true;
        }
    }
    return passed;
}

// ==================== 抽卡 ====================

function drawOpportunityCard() {
    const data = getPlayerData();
    if (!data) return null;
    
    if (data.energy <= 0) {
        showAlert('精力值为0，无法操作！请先休息增加精力。');
        return null;
    }
    
    data.energy = Math.max(-5, data.energy - 5);
    savePlayerData(data);
    
    const cardIndex = Math.floor(Math.random() * OPPORTUNITY_CARDS.length);
    const card = OPPORTUNITY_CARDS[cardIndex];
    let result = card.effect();
    
    // 顺流层加成
    if (data.layer === 'prosperity' && (card.title.includes('收入') || card.title.includes('收益'))) {
        addPassiveIncome(Math.floor(data.passiveIncome * 0.05));
        result += ' [顺流+5%被动收入]';
    }
    
    const updatedData = getPlayerData();
    updatedData.maxPassiveIncome = Math.max(updatedData.maxPassiveIncome, updatedData.passiveIncome);
    savePlayerData(updatedData);
    
    return { ...card, result };
}

function drawAdversityCard() {
    const data = getPlayerData();
    if (!data) return null;
    
    if (data.energy <= 0) {
        showAlert('精力值为0，无法操作！请先休息增加精力。');
        return null;
    }
    
    data.energy = Math.max(-5, data.energy - 5);
    savePlayerData(data);
    
    const cardIndex = Math.floor(Math.random() * ADVERSITY_CARDS.length);
    const card = ADVERSITY_CARDS[cardIndex];
    const result = card.effect();
    
    return { ...card, result };
}

// ==================== 辅助函数 ====================

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

// 投资项目
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
    // 顺流层投资收益率 +50%
    const rate = data.layer === 'prosperity' ? 0.0075 : 0.005;
    data.passiveIncome += Math.floor(amount * rate);
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
    // 资产产生被动收入
    const rates = { property: 0.005, stocks: 0.004, business: 0.008, sideJob: 0.006 };
    const rate = (data.layer === 'prosperity') ? (rates[type] || 0.005) * 1.5 : (rates[type] || 0.005);
    data.passiveIncome += Math.floor(amount * rate);
    data.maxPassiveIncome = Math.max(data.maxPassiveIncome, data.passiveIncome);
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
    // 出售时按比例减少被动收入
    const ratio = amount / (data.assets[type] + amount || 1);
    const piLoss = Math.floor(data.passiveIncome * ratio * 0.5);
    
    data.assets[type] -= amount;
    data.cash += amount;
    data.assets.cash = data.cash;
    data.passiveIncome = Math.max(0, data.passiveIncome - piLoss);
    data.totalAsset = data.assets.cash + data.assets.property + 
                      data.assets.stocks + data.assets.business + data.assets.sideJob;
    savePlayerData(data);
    return true;
}

// 慈善捐赠
function doCharity(amount) {
    const data = getPlayerData();
    if (!data || data.cash < amount) {
        showAlert('现金不足！');
        return false;
    }
    data.cash -= amount;
    data.assets.cash = data.cash;
    data.charity += amount;
    data.totalAsset = data.assets.cash + data.assets.property + 
                      data.assets.stocks + data.assets.business + data.assets.sideJob;
    savePlayerData(data);
    return true;
}

// 购买保险
function buyInsurance() {
    const data = getPlayerData();
    if (!data || data.cash < 3000) return false;
    deductCash(3000);
    data.insurance = 10;
    savePlayerData(data);
    return true;
}

// 检查财务自由（用于旧兼容）
function checkFinancialFreedom() {
    const data = getPlayerData();
    if (!data) return false;
    return data.passiveIncome >= getTotalExpense(data);
}

// 检查是否60岁
function checkRetirement() {
    const data = getPlayerData();
    if (!data) return false;
    return data.age >= 60;
}

// 格式化金额
function formatMoney(amount) {
    return '¥' + amount.toLocaleString();
}
