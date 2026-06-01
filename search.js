const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  // 1. 读取 config.csv 文件
  const csvPath = path.join(__dirname, 'config.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // 解析 CSV 文件，跳过表头，获取新闻数组
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line !== '');
  const newsList = lines.slice(1); // 跳过表头 'news'
  
  console.log(`共读取到 ${newsList.length} 条新闻：`);
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
      await page.waitForTimeout(Math.random() * 10000 + 10000);
        
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
