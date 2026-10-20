const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HOT_API_URL = 'https://100tools.cn/hot-api/weibo';
const HOT_NEWS_COUNT = 20;
const HOT_API_TIMEOUT = 10000;

// 从 100tools.cn 热榜接口获取微博热搜标题
async function fetchHotNewsList() {
  const resp = await fetch(HOT_API_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(HOT_API_TIMEOUT) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const json = await resp.json();
  if (json.code !== 200 || !Array.isArray(json.data)) throw new Error(`接口返回异常: code=${json.code}`);

  const titles = json.data.map(item => item.title).filter(Boolean).slice(0, HOT_NEWS_COUNT);
  if (titles.length === 0) throw new Error('热搜列表为空');

  return titles;
}

// 兜底数据源: config.csv, 首行为表头 news, 之后每行一个关键词
function readLocalNewsList() {
  const csvContent = fs.readFileSync(path.join(__dirname, 'config.csv'), 'utf-8');
  return csvContent.split('\n').map(line => line.trim()).filter(line => line !== '').slice(1);
}

async function getNewsList() {
  try {
    return await fetchHotNewsList();
  } catch (error) {
    console.warn(`微博热搜获取失败（${error.message}）, 改用本地 config.csv`);
    return readLocalNewsList();
  }
}

async function main() {
  // 1. 获取搜索关键词: 微博热搜前 20 条, 失败则回落到 config.csv
  const newsList = await getNewsList();
  if (newsList.length === 0) throw new Error('没有可用的搜索关键词');

  console.log(`共准备 ${newsList.length} 条搜索关键词：`);
  console.log(newsList);
  console.log('');
  
  // 2. 启动本地浏览器并持久化数据
  const userDataDir = path.join(__dirname, 'browser-data'); // 浏览器数据存储目录
  const browser = await chromium.launchPersistentContext(userDataDir, { 
    headless: false,
    channel: 'chrome', // 使用本地安装的 Chrome/Chromium 浏览器
    viewport: { width: 1280, height: 720 },
    locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  // 3. 遍历新闻列表,执行搜索
  for (let i = 0; i < newsList.length; i++) {
    const news = newsList[i];
    console.log(`[${i + 1}/${newsList.length}] 正在搜索: ${news}`);
      
    // 2.1 打开新页面
    const page = await browser.newPage();
      
    try {
      // 2.1 打开 Bing 搜索页面
      await page.goto('https://cn.bing.com/', { waitUntil: 'domcontentloaded' });
        
      // 2.2 找到搜索框并填写搜索词
      await page.fill('#sb_form_q', news);
        
      // 2.3 执行搜索(按回车键)
      await page.press('#sb_form_q', 'Enter');
        
      // 等待搜索结果加载
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(Math.random() * 5000 + 5000);
        
      console.log(`  ✓ 搜索完成: ${news}`);
    } catch (error) {
      console.error(`  ✗ 搜索失败: ${news}`, error.message);
    }
    // 不关闭页面,保留所有搜索结果
  }
  
  console.log('\n所有搜索任务完成！');
  
  // 关闭浏览器
  await browser.close();
}

main().catch(err => {
  console.error('程序执行出错:', err);
  process.exit(1);
});
