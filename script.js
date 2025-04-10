// 初始化全局变量
// 音频播放对象
let audio = new Audio();
// 歌词源文本，供中途修改
let lyricText = '';
// 歌词数据对象，存储解析后的歌词
let lyric;
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
导致的“Uncaught (in promise) DOMException: 
The element has no supported sources.”错误，
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
    
    // 暂停
    // 图标更新
    function updatePauseIcon(isPlaying, button) {
        button.icon = isPlaying ? 'pause--outlined' : 'play_arrow--outlined';
    }
    // 点击事件
    controllers.pause.addEventListener('click', () => {
        const isPlaying = !audio.paused && !audio.ended;
        isPlaying ? audio.pause() : audio.play();
    });
    // 监听播放状态变化
    audio.addEventListener('play', () => updatePauseIcon(true, controllers.pause));
    audio.addEventListener('pause', () => updatePauseIcon(false, controllers.pause));
    audio.addEventListener('ended', () => {
        updatePauseIcon(false, controllers.pause);
        controllers.progress.value = 0;
        audio.currentTime = 0;
    });

    // 步退
    controllers.backward.addEventListener('click', () => {
        // 防止过度
        if (audio.currentTime > 5) {
            audio.currentTime -= 5;
        } else {
            audio.currentTime = 0;
        }
    });

    // 步进
    controllers.forward.addEventListener('click', () => {
        // 防止过度
        if (duration - audio.currentTime > 5) {
            audio.currentTime += 5;
        } else {
            audio.currentTime = 0;
        }
    });
    
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
    
    // 复制按钮
    const copyLyricButton = document.getElementById('copy-spl');
    copyLyricButton.addEventListener('click', copyLyric)

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

    // 监听歌词文件选择
    lyricInput.addEventListener('change', function(event) {
        const lyricFile = event.target.files[0];
        // 读取文件
        const reader = new FileReader();
        reader.onload = function(e) {
            updateLyric(e.target.result);
        };
        reader.readAsText(lyricFile);
    });

    // 触发文件选择
    lyricChooser.addEventListener('click', function() {
        lyricInput.click();
    });

    // 编辑
    // 窗口
    const lyricEditor = document.getElementById('lyric-editor');
    const lyricEditorDialog = document.getElementById('lyric-editor-dialog');
    const cancelButton = lyricEditorDialog.querySelector('mdui-button.cancel');
    cancelButton.addEventListener('click', () => lyricEditorDialog.open = false);
    const submitButton = lyricEditorDialog.querySelector('mdui-button.submit');
    const lyricContent = lyricEditorDialog.querySelector('mdui-text-field.content');
    // 存储
    submitButton.addEventListener('click', function() {
        updateLyric(lyricContent.value);
        lyricEditorDialog.open = false;
    });
    // 打开窗口
    lyricEditor.addEventListener('click', function() {
        lyricContent.value = lyricText;
        lyricEditorDialog.open = true;
    });
}

// 解析歌词
function parseLyric(text) {
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
    
    return result;
}

// 渲染歌词
function renderLyric(lyric) {
    const container = document.getElementById('container');
    const listElement = document.createElement('mdui-list');
    // 递归展开对象
    lyric.lines.forEach((line, lineIndex) => {
        // 创建 mdui-list-item 作为每一行的容器
        const lineElementBox = document.createElement('mdui-list-item');
        
        // 创建自定义 div 用于显示歌词行
        const lineElement = document.createElement('div');
        lineElement.slot = 'custom'; // 如果 mdui-list-item 支持 slot
        lineElement.className = 'lyric-line';
        lineElement.dataset.lineIndex = lineIndex;
        lineElement.id = `line-${lineIndex}`;
        
        // 将 div 添加到 <mdui-list-item>
        lineElementBox.appendChild(lineElement);
        
        // 遍历每行的单词，创建 <mdui-chip>
        line.words.forEach((word, itemIndex) => {
            const itemElement = document.createElement('mdui-chip');
            itemElement.textContent = word.content; // 设置单词内容
            itemElement.className = 'lyric-item';
            itemElement.dataset.itemIndex = itemIndex; // 单词序号
            itemElement.dataset.lineIndex = lineIndex; // 行号
            itemElement.id = `line-${lineIndex}-item-${itemIndex}`;
            
            itemElement.addEventListener('click', (event) => {
                const currentLineIndex = parseInt(event.target.dataset.lineIndex, 10);
                const currentItemIndex = parseInt(event.target.dataset.itemIndex, 10);
                retag(currentLineIndex, currentItemIndex);
            });
            
            // 将单词 chip 添加到行 div 中
            lineElement.appendChild(itemElement);
        });
        
        // 将整行添加到列表容器中
        listElement.appendChild(lineElementBox);
    });

    container.innerHTML = '';
    container.appendChild(listElement);
}

// 更新歌词
function updateLyric(text) {
    lyricText = text;
    lyric = parseLyric(lyricText);
    renderLyric(lyric);
}

function retag(line, item) {
    // 确保 line 和 item 是数字
    line = parseInt(line, 10);
    item = parseInt(item, 10);
    
    // lyric.lines[line].words.forEach((word, wordIndex) => {
    //     console.log(item,wordIndex);
    //     word.start = null;
    // });
    // lyric.lines[line].end = null;
    const lastItem = { ...currentItem };
    currentItem = [line, item];
    
    // 修复选择器
    const lastItemElement = document.getElementById(`line-${lastItem[0]}`).querySelector(`mdui-chip#line-${lastItem[0]}-item-${lastItem[1]}`);
    if (lastItemElement) lastItemElement.loading = false;
    const currentItemElement = document.getElementById(`line-${currentItem[0]}`).querySelector(`mdui-chip#line-${currentItem[0]}-item-${currentItem[1]}`);
    if (currentItemElement) {
        currentItemElement.loading = true;
    }
}

function tag() {
    const lastItem = { ...currentItem };
    if (lastItem[1] >= 0) {
        lyric.lines[lastItem[0]].words[lastItem[1]].start = formatTime(audio.currentTime);
        if (currentItem[1] + 1 < lyric.lines[lastItem[0]].words.length) {
            currentItem[1]++;
            // 修复选择器中的连字符
            const lastItemElement = document.getElementById(`line-${lastItem[0]}`).querySelector(`mdui-chip#line-${lastItem[0]}-item-${lastItem[1]}`);
                lastItemElement.loading = false;
                lastItemElement.elevated = true;

            // 修复选择器中的连字符
            const currentItemElement = document.getElementById(`line-${currentItem[0]}`).querySelector(`mdui-chip#line-${currentItem[0]}-item-${currentItem[1]}`);
            if (currentItemElement) {
                currentItemElement.loading = true;
            }
        } else {
            currentItem[1] = -1;
            // 修复选择器中的连字符
            const lastItemElement = document.getElementById(`line-${lastItem[0]}`).querySelector(`mdui-chip#line-${lastItem[0]}-item-${lastItem[1]}`);
            if (lastItemElement) {
                lastItemElement.loading = false;
                lastItemElement.elevated = true;
            }
        }
    } else {
        lyric.lines[lastItem[0]].end = formatTime(audio.currentTime);
        if (currentItem[0] + 1 < lyric.lines.length) {
            currentItem[0]++;
            currentItem[1] = 0;
            // 修复选择器中的连字符
            const currentItemElement = document.getElementById(`line-${currentItem[0]}`).querySelector(`mdui-chip#line-${currentItem[0]}-item-${currentItem[1]}`);
            if (currentItemElement) {
                currentItemElement.loading = true;
            }
        } else {
            currentItem = [-1, -1];
            mdui.snackbar({
                message: "同步完成"
            });
        }
    }
}

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
    
    // 复制到剪贴板
    try {
        await navigator.clipboard.writeText(result);
        mdui.snackbar({
            message: "已复制"
        });
    } catch (err) {
        mdui.snackbar({
            message: `复制失败（${err}）`
        });
    }
    
    return result; // 仍然返回结果字符串
}



// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    addActionForAudio();
    addActionForLyric();
});
