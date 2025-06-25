document.addEventListener('DOMContentLoaded', function() {
    const matchConditions = document.getElementById('matchConditions');
    const addConditionBtn = document.getElementById('addCondition');
    const domainSelect = document.getElementById('domainSelect');
    const copyDomainBtn = document.getElementById('copyDomain');
    const deleteDomainBtn = document.getElementById('deleteDomain');
    const borderColorInput = document.getElementById('borderColor');

    let currentDomain = '';
    let domainConfigs = {};
    let saveTimeout = null;

    // 创建匹配条件输入框
    function createConditionInput(value = '') {
        const div = document.createElement('div');
        div.className = 'match-condition';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入匹配文本';
        input.value = value;
        
        // 添加输入事件监听器，实现自动保存
        input.addEventListener('input', function() {
            autoSave();
        });
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-condition';
        removeBtn.textContent = '×';
        removeBtn.onclick = function() {
            div.remove();
            autoSave();
        };
        
        div.appendChild(input);
        div.appendChild(removeBtn);
        
        // 如果是空白输入框，自动获得焦点
        if (!value) {
            setTimeout(() => {
                input.focus();
            }, 100);
        }
        
        return div;
    }

    // 添加新的匹配条件
    addConditionBtn.addEventListener('click', function() {
        // 将新输入框插入到第一个位置
        const firstChild = matchConditions.firstChild;
        matchConditions.insertBefore(createConditionInput(), firstChild);
        autoSave();
    });

    // 自动保存功能
    function autoSave() {
        // 清除之前的定时器
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        // 设置新的定时器，延迟500ms保存
        saveTimeout = setTimeout(() => {
            saveCurrentConfig();
        }, 500);
    }

    // 更新域名选择器
    function updateDomainSelector() {
        domainSelect.innerHTML = '';
        Object.keys(domainConfigs).forEach(domain => {
            const option = document.createElement('option');
            option.value = domain;
            option.textContent = domain;
            domainSelect.appendChild(option);
        });
    }

    // 加载当前域名的配置
    function loadDomainConfig(domain) {
        const config = domainConfigs[domain] || {
            matchTexts: [],
            borderColor: '#ff69b4'
        };

        // 清空现有条件
        matchConditions.innerHTML = '';
        
        // 添加匹配条件（按字母顺序排序）
        if (config.matchTexts && config.matchTexts.length > 0) {
            const sortedTexts = [...config.matchTexts].sort();
            sortedTexts.forEach(text => {
                matchConditions.appendChild(createConditionInput(text));
            });
        }
        
        // 始终添加一个空行
        const firstChild = matchConditions.firstChild;
        matchConditions.insertBefore(createConditionInput(), firstChild);

        // 设置边框颜色
        borderColorInput.value = config.borderColor;
    }

    // 保存当前配置
    function saveCurrentConfig() {
        const inputs = matchConditions.getElementsByTagName('input');
        const matchTexts = Array.from(inputs)
            .map(input => input.value.trim().replace(/ /g, '_'))
            .filter(text => text !== '');

        const config = {
            matchTexts: matchTexts,
            borderColor: borderColorInput.value
        };

        domainConfigs[currentDomain] = config;
        chrome.storage.sync.set({ domainConfigs }, function() {
            showStatus('配置已自动保存');
            
            // 自动添加一个空行并获取焦点
            const firstChild = matchConditions.firstChild;
            const newInput = createConditionInput();
            matchConditions.insertBefore(newInput, firstChild);
            
            // 通知所有标签页更新配置
            chrome.tabs.query({}, function(tabs) {
                tabs.forEach(function(tab) {
                    // 检查标签页是否有效
                    if (tab.url && tab.url.startsWith('http')) {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'updateConfig',
                            domainConfigs: domainConfigs
                        }).catch(error => {
                            // 忽略连接错误
                            console.log('无法发送消息到标签页:', tab.url);
                        });
                    }
                });
            });
        });
    }

    // 显示状态信息
    function showStatus(message) {
        const status = document.getElementById('status');
        status.textContent = message;
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    }

    // 域名选择改变时
    domainSelect.addEventListener('change', function() {
        currentDomain = this.value;
        loadDomainConfig(currentDomain);
    });

    // 边框颜色输入框变化时自动保存
    borderColorInput.addEventListener('input', function() {
        autoSave();
    });

    // 复制当前配置到新域名
    copyDomainBtn.addEventListener('click', function() {
        const newDomain = prompt('请输入新的域名（例如：example.com）：');
        if (newDomain) {
            domainConfigs[newDomain] = { ...domainConfigs[currentDomain] };
            chrome.storage.sync.set({ domainConfigs }, function() {
                updateDomainSelector();
                domainSelect.value = newDomain;
                currentDomain = newDomain;
                showStatus('配置已复制！');
            });
        }
    });

    // 删除当前域名配置
    deleteDomainBtn.addEventListener('click', function() {
        if (confirm(`确定要删除 ${currentDomain} 的配置吗？`)) {
            delete domainConfigs[currentDomain];
            chrome.storage.sync.set({ domainConfigs }, function() {
                updateDomainSelector();
                if (Object.keys(domainConfigs).length > 0) {
                    currentDomain = Object.keys(domainConfigs)[0];
                    domainSelect.value = currentDomain;
                    loadDomainConfig(currentDomain);
                } else {
                    currentDomain = '';
                    matchConditions.innerHTML = '';
                    matchConditions.appendChild(createConditionInput());
                    borderColorInput.value = '#ff69b4';
                }
                showStatus('配置已删除！');
            });
        }
    });

    // 初始化
    chrome.storage.sync.get(['domainConfigs'], function(result) {
        if (result.domainConfigs) {
            domainConfigs = result.domainConfigs;
        }
        
        // 获取当前标签页的域名
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const url = new URL(tabs[0].url);
            currentDomain = url.hostname;
            
            // 如果当前域名没有配置，创建一个新的
            if (!domainConfigs[currentDomain]) {
                domainConfigs[currentDomain] = {
                    matchTexts: [],
                    borderColor: '#ff69b4'
                };
            }
            
            updateDomainSelector();
            domainSelect.value = currentDomain;
            loadDomainConfig(currentDomain);
            
            // 检查是否有从右键菜单传递的alt文本
            chrome.storage.local.get(['pendingAltText'], function(result) {
                if (result.pendingAltText) {
                    // 将alt文本添加到第一个空白输入框
                    const inputs = matchConditions.getElementsByTagName('input');
                    for (let input of inputs) {
                        if (!input.value.trim()) {
                            input.value = result.pendingAltText;
                            input.focus();
                            // 清除存储的alt文本
                            chrome.storage.local.remove(['pendingAltText']);
                            // 自动保存
                            autoSave();
                            break;
                        }
                    }
                }
            });
        });
    });
}); 