let domainConfigs = {};
let currentDomain = window.location.hostname;

// 添加高亮样式
function addHighlightStyle() {
    const style = document.createElement('style');
    style.id = 'highlight-style';
    updateHighlightStyle(style);
    document.head.appendChild(style);
}

// 更新高亮样式
function updateHighlightStyle(styleElement) {
    const config = domainConfigs[currentDomain] || {
        matchTexts: [],
        borderColor: '#ff69b4'
    };

    styleElement.textContent = `
        .highlight-border {
            outline: 10px dotted ${config.borderColor} !important;
            margin: 10px;
        }
    `;
}

// 检查文本是否匹配任一条件
function isTextMatch(text) {
    if (!text) return false;
    const config = domainConfigs[currentDomain];
    if (!config || !config.matchTexts) return false;
    
    // 将文本按空格分割成数组
    const textWords = text.split(/\s+/).filter(word => word.length > 0);
    
    // 检查是否有任一匹配条件完全匹配文本中的任一单词
    return config.matchTexts.some(matchText => {
        const matchWords = matchText.split(/\s+/).filter(word => word.length > 0);
        // 检查匹配条件的所有单词是否都在文本中
        return matchWords.every(word => textWords.includes(word));
    });
}

// 检查并高亮图片
function highlightImages() {
    const images = document.getElementsByTagName('img');
    for (let img of images) {
        if (isTextMatch(img.alt)) {
            img.classList.add('highlight-border');
        } else {
            img.classList.remove('highlight-border');
        }
    }
}

// 初始化
function init() {
    // 加载保存的配置
    chrome.storage.sync.get(['domainConfigs'], function(result) {
        if (result.domainConfigs) {
            domainConfigs = result.domainConfigs;
            addHighlightStyle();
            highlightImages();
        }
    });

    // 监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                highlightImages();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 监听配置更新消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateConfig') {
            domainConfigs = message.domainConfigs;
            
            const styleElement = document.getElementById('highlight-style');
            if (styleElement) {
                updateHighlightStyle(styleElement);
            }
            
            highlightImages();
        } else if (message.action === 'getImageAlt') {
            // 查找匹配的图片并返回alt属性
            const images = document.getElementsByTagName('img');
            for (let img of images) {
                if (img.src === message.imageSrc) {
                    sendResponse({ altText: img.alt || '' });
                    return;
                }
            }
            sendResponse({ altText: '' });
        }
    });
}

// 启动插件
init(); 