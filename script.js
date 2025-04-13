// 初始化全局变量
// 音频播放对象
let audio = new Audio();
// 歌词源文本，供中途修改
let lyricText = '';
// 歌词数据对象，存储解析后的歌词
let lyric;
// 当前处理的词坐标
let currentItem = [0, 0];


// 格式化时间
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = secs.toFixed(2).padStart(5, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
}

/* 
该函数存在一些作者不知道如何解决的问题，
即音频手动定位至末尾 / 在末尾步进
导致的"Uncaught (in promise) DOMException: 
The element has no supported sources."错误，
目前使用一些简单粗暴的小伎俩避开了触发条件，
虽然目前使用接近正常，
但该问题仍谈不上已解决。
*/
// 添加音频功能
function addActionForAudio() {
    // 获取节点
    const audioChooser = document.getElementById('audio-chooser');
    const audioInput = document.getElementById('audio-input');
    const controllers = {
        pause: document.getElementById('controller-pause'),
        backward: document.getElementById('controller-backward'),
        forward: document.getElementById('controller-forward'),
        progress: document.getElementById('controller-progress'),
        speed: document.getElementById('controller-speed'),
        tag: document.getElementById('controller-tag')
    };
    
    
    // 音频总时长
    let duration;
    
    
    // 控制函数
    // 步退
    function backward() {
        // 防止过度
        if (audio.currentTime > 2) {
            audio.currentTime -= 2;
        } else {
            audio.currentTime = 0;
        }
    }
    // 暂停
    function pause() {
        const isPlaying = !audio.paused && !audio.ended;
        isPlaying ? audio.pause() : audio.play();
    }
    // 步进
    function forward() {
        // 防止过度
        if (duration - audio.currentTime > 2) {
            audio.currentTime += 2;
        } else {
            audio.currentTime = 0;
        }
    }
    
    
    // 快捷键操作绑定
    document.addEventListener('keydown', function(event) {
        // 若不是在输入
        if (document.activeElement.tagName !== 'MDUI-TEXT-FIELD') {
            if (event.key === 'k' || event.key === 'K') {
                // 标记
                tag();
            } else if (event.key === 's' || event.key === 'S') {
                // 步退
                backward();
            } else if (event.key === 'd' || event.key === 'D') {
                // 暂停
                pause();
            } else if (event.key === 'f' || event.key === 'F') {
                // 步进
                forward();
            } else if (event.key === 'j' || event.key === 'J') {
                // 焦点左移
                reTag(currentItem[0], currentItem[1] - 1);
            } else if (event.key === 'l' || event.key === 'L') {
                // 焦点右移
                reTag(currentItem[0], currentItem[1] + 1);
            } else if (event.key === 'i' || event.key === 'I') {
                // 焦点上移
                reTag(currentItem[0] - 1, 0);
            } else if (event.key === 'm' || event.key === 'M') {
                // 焦点下移
                reTag(currentItem[0] + 1, 0);
            }
        }
    });
    
    
    // 按钮操作绑定document.activeElement.tagN
    // 暂停
    // 图标更新
    function updatePauseIcon(isPlaying, button) {
        button.icon = isPlaying ? 'pause--outlined' : 'play_arrow--outlined';
    }
    // 点击事件
    controllers.pause.addEventListener('click', pause);
    // 监听播放状态变化
    audio.addEventListener('play', () => updatePauseIcon(true, controllers.pause));
    audio.addEventListener('pause', () => updatePauseIcon(false, controllers.pause));
    audio.addEventListener('ended', () => {
        updatePauseIcon(false, controllers.pause);
        controllers.progress.value = 0;
        audio.currentTime = 0;
    });
    
    // 步退
    controllers.backward.addEventListener('click', backward);
    
    // 步进
    controllers.forward.addEventListener('click', forward);
    
    // 进度条
    // 标签
    controllers.progress.labelFormatter = (value) => formatTime(value);
    // 更新
    audio.addEventListener('timeupdate', () => {
        controllers.progress.value = audio.currentTime;
    });
    // 操作
    controllers.progress.addEventListener('change', () => {
        // 防止过度
        const targetTime = controllers.progress.value;
        if (duration - targetTime > .5) {
            audio.currentTime = targetTime;
        } else {
            audio.currentTime = 0;
        }
    });
    
    // 标记
    controllers.tag.addEventListener('click', tag);
    
    // 倍速
    // 弹窗
    const speedEditorDialog = document.getElementById('speed-editor-dialog');
    const okButton = speedEditorDialog.querySelector('mdui-button.ok');
    okButton.addEventListener('click', () => speedEditorDialog.open = false);
    // 控制条
    const speedProcess = speedEditorDialog.querySelector('mdui-slider.speed');
    speedProcess.value = audio.playbackRate * 10;
    speedProcess.addEventListener('input', () => {
        audio.playbackRate = speedProcess.value / 10;
    });
    // 标签
    speedProcess.labelFormatter = (value) => `×${value / 10}`;
    // 监听点击
    controllers.speed.addEventListener('click', () => {
        speedEditorDialog.open = true;
    });
    
    // 复制
    const copyLyricButton = document.getElementById('copy-spl');
    copyLyricButton.addEventListener('click', copyLyric);
    
    
    // 更新音频
    function updateAudio(audioFile) {
        // 清理旧的
        if (audio.src) {
            audio.pause();
            updatePauseIcon(false, controllers.pause);
            URL.revokeObjectURL(audio.src);
        }
        // 创建新的
        audio.src = URL.createObjectURL(audioFile);
        
        // 初始化
        audio.addEventListener('loadedmetadata', () => {
            duration = audio.duration;
            // 初始化进度条
            controllers.progress.max = duration;
        });
        
        // 启用所有控制器
        for (const key in controllers) {
            const element = controllers[key];
            if (element) {
                element.disabled = false;
            }
        }
    }
    
    
    // 监听音频文件选择
    audioInput.addEventListener('change', (event) => {
        const audioFile = event.target.files[0];
        if (audioFile) {
            updateAudio(audioFile);
            mdui.snackbar({
                message: "音频提交完成",
                autoCloseDelay: 3000,
                closeable: true
            });
        }
    });
    
    
    // 触发文件选择
    audioChooser.addEventListener('click', () => {
        audioInput.click();
    });
}

// 添加歌词功能
function addActionForLyric() {
    // 获取节点
    const lyricChooser = document.getElementById('lyric-chooser');
    const lyricInput = document.getElementById('lyric-input');
    const lyricEditor = document.getElementById('lyric-editor');
    const lyricEditorDialog = document.getElementById('lyric-editor-dialog');
    
    // 监听歌词文件选择
    lyricInput.addEventListener('change', function(event) {
        const lyricFile = event.target.files[0];
        // 判断文件过大
        if (lyricFile.size > 5 * 1024 * 1024) {
            mdui.snackbar({
                message: "歌词文件过大",
                closeable: true
            });
        } else {
            // 读取文件
            const reader = new FileReader();
            reader.onload = function(e) {
                updateLyric(e.target.result);
            };
            reader.readAsText(lyricFile);
        }
    });

    // 触发文件选择
    lyricChooser.addEventListener('click', function() {
        lyricInput.click();
    });

    // 编辑窗口
    const cancelButton = lyricEditorDialog.querySelector('mdui-button.cancel');
    const submitButton = lyricEditorDialog.querySelector('mdui-button.submit');
    const lyricContent = lyricEditorDialog.querySelector('mdui-text-field.content');
    // 取消
    cancelButton.addEventListener('click', () => lyricEditorDialog.open = false);
    // 提交
    submitButton.addEventListener('click', function() {
        updateLyric(lyricContent.value);
        lyricEditorDialog.open = false;
    });
    // 打开窗口
    lyricEditor.addEventListener('click', function() {
        lyricContent.value = lyricText;
        const textAria = lyricEditorDialog.querySelector('mdui-text-field.content');
        lyricEditorDialog.addEventListener('opened', () => {
            textAria.rows = (lyricEditorDialog.clientHeight / 24 - 8);
        });
        lyricEditorDialog.open = true;
    });
}

// 解析歌词
function parseLyric(text) {
    mdui.snackbar({
        message: "正在解析歌词",
        autoCloseDelay: 3000,
        closeable: true
    });
    
    // 将文本按行分割
    const rawLines = text.trim().split('\n');
    
    // 定义结果对象
    const result = {
        lines: []
    };
    
    // 处理每一行
    rawLines.forEach(line => {
        // 提取所有时间戳
        const timestamps = [];
        const timestampRegex = /\[(\d{2}:\d{2}\.\d{2,3})\]/g;
        let match;
        while ((match = timestampRegex.exec(line)) !== null) {
            const timestamp = match[1];
            const decimalPart = timestamp.split('.')[1];
            if (decimalPart.length === 2 || decimalPart.length === 3) {
                timestamps.push(timestamp);
            }
        }
        
        // 移除时间戳后的纯文本
        let content = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
        // 将连续多个空格替换为单个空格
        content = content.replace(/\s+/g, ' ');
        
        // 分词
        const words = [];
        let currentWord = '';
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const isCJK = /[\u4E00-\u9FFF]/.test(char);
            const isSpace = /\s/.test(char);
            
            if (isSpace) {
                if (currentWord) {
                    words.push(currentWord + ' ');
                    currentWord = '';
                }
            } else if (isCJK) {
                if (currentWord) {
                    words.push(currentWord);
                    currentWord = '';
                }
                currentWord = char;
                // 检查下一个字符是否为空格
                if (i + 1 < content.length && /\s/.test(content[i + 1])) {
                    words.push(currentWord + ' ');
                    currentWord = '';
                    i++; // 跳过空格
                } else {
                    words.push(currentWord);
                    currentWord = '';
                }
            } else {
                currentWord += char;
            }
        }
        
        // 处理最后一个词
        if (currentWord) {
            words.push(currentWord);
        }
        
        // 分配时间戳
        const lineWords = words.map((word, index) => ({
            content: word,
            start: index < timestamps.length ? timestamps[index] : null
        }));
        
        // 设置行结束时间
        const endTime = timestamps.length > words.length ? 
            timestamps[timestamps.length - 1] : null;
            
        result.lines.push({
            words: lineWords,
            end: endTime
        });
    });
    
    mdui.snackbar({
        message: "歌词解析完成",
        autoCloseDelay: 3000,
        closeable: true
    });
    
    return result;
}

// 单行歌词重分词
function reparseLyricLine(line, text) {
    // 分割
    const newWords = text.split('/');
    // 修改整行
    const lineObject = {
        words: newWords.map(word => ({ content: word, start: null })),
        end: null
    };
    lyric.lines[line] = lineObject;
    
    // 重新渲染
    // 获取父节点
    const lineElement = document.getElementById(`line-${line}`);
    lineElement.innerHTML = '';
    // 遍历创建单词
    lineObject.words.forEach((word, itemIndex) => {
        const itemElement = document.createElement('mdui-chip');
        itemElement.textContent = word.content; // 设置单词内容
        itemElement.className = 'lyric-item';
        itemElement.dataset.itemIndex = itemIndex; // 单词序号
        itemElement.dataset.lineIndex = line; // 行号
        itemElement.id = `line-${line}-item-${itemIndex}`;
        
        // 点击单词重新标记
        itemElement.addEventListener('click', (event) => {
            event.stopPropagation();
            const currentLineIndex = parseInt(event.target.dataset.lineIndex, 10);
            const currentItemIndex = parseInt(event.target.dataset.itemIndex, 10);
            reTag(currentLineIndex, currentItemIndex);
        });
        
        // 添加单词到行
        lineElement.appendChild(itemElement);
    });
}

// 渲染歌词
function renderLyric(lyric) {
    const container = document.getElementById('container');
    const listElement = document.createElement('mdui-list');
    
    // 递归展开
    lyric.lines.forEach((line, lineIndex) => {
        // 创建行容器
        const lineElementBox = document.createElement('mdui-list-item');
        
        // 显示歌词行
        const lineElement = document.createElement('div');
        lineElement.slot = 'custom';
        lineElement.className = 'lyric-line';
        lineElement.dataset.lineIndex = lineIndex;
        lineElement.id = `line-${lineIndex}`;
        lineElementBox.appendChild(lineElement);
        lineElementBox.addEventListener('click', (event) => {
           const line = event.target.dataset.lineIndex;
           const text = lyric.lines[line].words.map(word => word.content).join('/');
           mdui.prompt({
                headline: "重新分词",
                description: "使用“/”为分隔符，重新分割本行歌词。",
                confirmText: "分词",
                cancelText: "取消",
                textFieldOptions: {
                    label: '歌词行',
                    value: text,
                    rows: '5'
                },
                onConfirm: (value) => reparseLyricLine(line, value),
            });
        });
        
        // 遍历创建单词
        line.words.forEach((word, itemIndex) => {
            const itemElement = document.createElement('mdui-chip');
            itemElement.textContent = word.content; // 设置单词内容
            itemElement.className = 'lyric-item';
            itemElement.dataset.itemIndex = itemIndex; // 单词序号
            itemElement.dataset.lineIndex = lineIndex; // 行号
            itemElement.id = `line-${lineIndex}-item-${itemIndex}`;
            // 若该单词已有时间戳
            if (word.start) {
                // 呈现为已标记
                itemElement.elevated = true;
            }
            
            // 点击单词重新标记
            itemElement.addEventListener('click', (event) => {
                event.stopPropagation();
                const currentLineIndex = parseInt(event.target.dataset.lineIndex, 10);
                const currentItemIndex = parseInt(event.target.dataset.itemIndex, 10);
                reTag(currentLineIndex, currentItemIndex);
            });
            
            // 添加单词到行
            lineElement.appendChild(itemElement);
        });
        
        // 添加整行到列表容器
        listElement.appendChild(lineElementBox);
    });
    
    // 清空原内容
    container.innerHTML = '';
    container.appendChild(listElement);
    
    // 激活首行首词
    reTag(0, 0);
}

// 更新歌词
function updateLyric(text) {
    // 更新文本
    lyricText = text;
    // 重新解析
    lyric = parseLyric(lyricText);
    // 重新渲染
    renderLyric(lyric);
}

// 重新标记
function reTag(line, item) {
    line = parseInt(line, 10);
    item = parseInt(item, 10);
    
    // 记录上一个单词
    const lastItem = { ...currentItem };
    // 临时赋，以防值无效
    const tmpCurrentItem = [line, item];
    if (line <= lyric.lines.length - 1 && line >= 0) {
        // 若行未溢出
        if (item <= lyric.lines[line].words.length - 1 && item >= 0) {
            // 若词未溢出
            const tmpCurrentItemElement = document.getElementById(`line-${tmpCurrentItem[0]}`).querySelector(`mdui-chip#line-${tmpCurrentItem[0]}-item-${tmpCurrentItem[1]}`);
            if (tmpCurrentItemElement) {
                // 将上一个取消活动状态
                const lastItemElement = document.getElementById(`line-${lastItem[0]}`).querySelector(`mdui-chip#line-${lastItem[0]}-item-${lastItem[1]}`);
                if (lastItemElement) lastItemElement.loading = false;
                // 为当前加上活动状态
                currentItem = [line, item];
                tmpCurrentItemElement.loading = true;
                // 页面随标记滚动
                const elementTop = tmpCurrentItemElement.getBoundingClientRect().top + window.pageYOffset;
                const targetPosition = elementTop - (window.innerHeight / 4);
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            } else {
                // 若词纸片不存在
                mdui.snackbar({
                    message: `找不到下一个词。`,
                    closeable: true
                });
            }
        } else if (item > lyric.lines[line].words.length - 1) {
            // 若行末
            reTag(line + 1, 0);
        } else if (line >= 1) {
            // 若行首
            reTag(line - 1, lyric.lines[line - 1].words.length - 1);
        } else {
            // 若首行行首
            mdui.snackbar({
                message: `该份歌词已切换到尽头。`,
                closeable: true
            });
        }
    } else {
        // 其他情况（末行行末或首 / 末行向上 / 下切换）
        mdui.snackbar({
            message: `该份歌词已切换到尽头。`,
            closeable: true
        });
    }
}

// 标记
function tag() {
    // 记录上一个单词
    const lastItem = { ...currentItem };
    
    // 本行未完成时
    if (lastItem[1] >= 0) {
        // 先记录时间
        lyric.lines[lastItem[0]].words[lastItem[1]].start = formatTime(audio.currentTime);
        // 若当前非行末
        if (currentItem[1] + 1 < lyric.lines[lastItem[0]].words.length) {
            // 上一个词已标记，激活下一个词
            currentItem[1]++;
            const lastItemElement = document.getElementById(`line-${lastItem[0]}`).querySelector(`mdui-chip#line-${lastItem[0]}-item-${lastItem[1]}`);
            lastItemElement.loading = false;
            lastItemElement.elevated = true;
            const currentItemElement = document.getElementById(`line-${currentItem[0]}`).querySelector(`mdui-chip#line-${currentItem[0]}-item-${currentItem[1]}`);
            if (currentItemElement) {
                currentItemElement.loading = true;
            }
        // 若当前是行末
        } else {
            // 使用 -1 标记为行末
            currentItem[1] = -1;
            // 行末词已标记，但不激活下一个词
            const lastItemElement = document.getElementById(`line-${lastItem[0]}`).querySelector(`mdui-chip#line-${lastItem[0]}-item-${lastItem[1]}`);
            if (lastItemElement) {
                lastItemElement.loading = false;
                lastItemElement.elevated = true;
            }
        }
    // 本行已完成时
    } else {
        // 先记录时间
        lyric.lines[lastItem[0]].end = formatTime(audio.currentTime);
        // 若已完成，直接返回
        if (currentItem[0] == -1) return;
        // 若还有下一行
        if (currentItem[0] + 1 < lyric.lines.length) {
            // 下一行首词活动
            currentItem[0]++;
            currentItem[1] = 0;
            const currentItemElement = document.getElementById(`line-${currentItem[0]}`).querySelector(`mdui-chip#line-${currentItem[0]}-item-${currentItem[1]}`);
            if (currentItemElement) {
                currentItemElement.loading = true;
            }
            // 页面随标记滚动
            const elementTop = currentItemElement.getBoundingClientRect().top + window.pageYOffset;
            const targetPosition = elementTop - (window.innerHeight / 4);
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        // 若无下一行
        } else {
            // 标记为完成
            currentItem = [-1, -1];
            // 提示
            mdui.snackbar({
                message: "同步完成",
                autoCloseDelay: 3000,
                closeable: true
            });
        }
    }
}

// 复制
async function copyLyric() {
    const result = lyric.lines
        .map(line => {
            const wordsStr = line.words
                .map(word => {
                    return word.start ? `[${word.start}]${word.content}` : word.content;
                })
                .join('');
            return line.end ? `${wordsStr}[${line.end}]` : wordsStr;
        })
        .join('\n');
    
    try {
        await navigator.clipboard.writeText(result);
        mdui.snackbar({
            message: "已复制",
            autoCloseDelay: 3000,
            closeable: true
        });
    } catch (err) {
        mdui.snackbar({
            message: `复制失败，可自行在对话框中复制。`,
            closeable: true
        });
        mdui.prompt({
            headline: "结果",
            description: "您可以手动全选后复制。",
            confirmText: '复制好了',
            cancelText: "关闭",
            textFieldOptions: {
                label: '歌词',
                value: result,
                rows: '5',
                readonly: true
            }
        });
    }
    
    // 也要返回
    return result;
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    mdui.setColorScheme('#4050A0');
    addActionForAudio();
    addActionForLyric();
    window.addEventListener('beforeunload', function(e) {
        const message = "系统可能不会保存您所做的更改。";
        e.returnValue = message;
        return message;
    });
});
