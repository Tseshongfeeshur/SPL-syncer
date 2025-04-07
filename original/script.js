// 初始化全局变量
let audio = new Audio(); // 音频播放对象
let lyrics = []; // 歌词数据数组，存储解析后的每一行
let currentLineIndex = 0; // 当前打轴的行索引
let currentWordIndex = 0; // 当前打轴的词索引
let lastScrolledLine = -1; // 上次滚动的行索引，用于优化滚动

// 初始化事件监听器
document.getElementById('audioInput').addEventListener('change', loadAudio); // 监听音频文件上传
document.getElementById('lrcInput').addEventListener('change', loadLrc); // 监听歌词文件上传
document.getElementById('playbackSpeed').addEventListener('change', updatePlaybackSpeed); // 监听播放速度调整
document.addEventListener('keydown', (e) => { // 监听空格键触发打轴
    if (e.code === 'Space') {
        e.preventDefault(); // 防止页面滚动
        tagCurrentWord();
    }
});
document.addEventListener('click', () => hideContextMenu()); // 点击页面隐藏右键菜单

// 加载音频文件并初始化播放器
function loadAudio() {
    const file = document.getElementById('audioInput').files[0];
    if (file) {
        audio.src = URL.createObjectURL(file); // 设置音频源为上传的文件
        audio.controls = true; // 显示播放控件
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = '<div class="progress"></div>'; // 创建进度条元素
        document.querySelector('.input-section').appendChild(audio); // 添加音频控件到页面
        document.querySelector('.input-section').appendChild(progressBar); // 添加进度条到页面
        audio.ontimeupdate = updateProgress; // 绑定时间更新事件，刷新进度条
        progressBar.onclick = adjustProgress; // 绑定点击事件，调整播放进度
        updatePlaybackSpeed(); // 初始化播放速度
    }
}

// 更新进度条并高亮当前播放行
function updateProgress() {
    const progress = document.querySelector('.progress');
    const percentage = (audio.currentTime / audio.duration) * 100; // 计算播放进度百分比
    progress.style.width = `${percentage}%`; // 更新进度条宽度
    highlightCurrentLine(); // 高亮当前播放的行
}

// 点击进度条调整播放位置
function adjustProgress(e) {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left; // 计算点击位置相对于进度条的偏移
    const percentage = clickX / rect.width; // 转换为百分比
    audio.currentTime = percentage * audio.duration; // 设置新的播放时间
}

// 更新播放速度
function updatePlaybackSpeed() {
    const speedInput = document.getElementById('playbackSpeed');
    let speed = parseFloat(speedInput.value); // 获取输入的播放速度
    if (isNaN(speed) || speed < 0.1) speed = 0.1; // 限制最小值为 0.1
    if (speed > 3) speed = 3; // 限制最大值为 3
    speed = Math.round(speed * 100) / 100; // 保留两位小数
    speedInput.value = speed.toFixed(2); // 更新输入框显示
    audio.playbackRate = speed; // 设置音频播放速度
}

// 加载并解析歌词文件
function loadLrc() {
    const file = document.getElementById('lrcInput').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            document.getElementById('sourceLrc').value = text; // 显示源文件内容（只读）
            parseLyricsFile(text, file.name); // 解析歌词文件
            renderLyrics(); // 渲染解析后的歌词到编辑区
            highlightCurrentWord(); // 高亮当前待打轴的词
        };
        reader.readAsText(file); // 以文本形式读取文件
    }
}

// 解析歌词文件（支持 LRC、TXT、SPL）
function parseLyricsFile(text, fileName) {
    lyrics = []; // 清空现有歌词数据
    const lines = text.split('\n').map(line => line.trim()).filter(line => line); // 分割行并移除空行
    const ext = fileName.toLowerCase().split('.').pop(); // 获取文件扩展名

    // 根据扩展名优先判断格式
    let format = 'txt'; // 默认纯文本
    if (ext === 'lrc') format = 'lrc';
    else if (ext === 'spl') format = 'spl';

    // 内容检测作为后备，确保兼容性
    const isLrcContent = lines.some(line => /^\[\d+:\d+\.\d+\]/.test(line)); // 检查是否有 LRC 时间戳
    const isSplContent = lines.some(line => /\[\d+:\d+\.\d+\].*\[\d+:\d+\.\d+\]/.test(line)); // 检查是否有 SPL 逐字时间戳
    if (isLrcContent && format !== 'spl') format = 'lrc'; // LRC 优先级高于 TXT
    else if (isSplContent) format = 'spl'; // SPL 优先级最高

    if (format === 'lrc') {
        // LRC 格式解析：保留行起始时间戳
        for (let line of lines) {
            const match = line.match(/\[(\d+:\d+\.\d+)\](.*)/);
            if (match) {
                const timestamp = match[1]; // 行起始时间戳
                const lyricText = match[2].trim(); // 歌词文本
                const words = splitWords(lyricText); // 分词
                const nonSpaceCount = words.filter(w => !w.isSpace).length; // 非空格词数量
                const lyricLine = {
                    timestamp: timestamp,
                    words: words,
                    timestamps: new Array(nonSpaceCount).fill(null), // 逐字时间戳初始为空
                    timestampMap: new Map(), // 非空格词到时间戳索引的映射
                    endTimestamp: null // 行结尾时间戳
                };
                updateTimestampMap(lyricLine); // 更新时间戳映射
                lyrics.push(lyricLine);
            }
        }
    } else if (format === 'spl') {
        // SPL 格式解析：支持逐字时间戳和行结尾时间戳
        for (let line of lines) {
            const timestampMatch = line.match(/^\[(\d+:\d+\.\d+)\](.*)/);
            if (timestampMatch) {
                const timestamp = timestampMatch[1]; // 行起始时间戳
                let content = timestampMatch[2];
                const words = [];
                const timestamps = [];
                let endTimestamp = null;

                // 提取行结尾时间戳（如果存在）
                const endMatch = content.match(/\[(\d+:\d+\.\d+)\]$/);
                if (endMatch) {
                    endTimestamp = endMatch[1];
                    content = content.replace(/\[(\d+:\d+\.\d+)\]$/, '');
                }

                // 解析逐字时间戳和文本
                let currentText = '';
                const splParts = content.split(/(\[\d+:\d+\.\d+\])/).filter(part => part); // 分割时间戳和文本
                let wordStart = true; // 标记是否为新词的开始
                for (let part of splParts) {
                    if (/\[\d+:\d+\.\d+\]/.test(part)) {
                        if (currentText && !wordStart) {
                            words.push({ text: currentText, isSpace: /\s/.test(currentText) });
                            timestamps.push(null);
                        }
                        if (!wordStart) timestamps.push(part.slice(1, -1)); // 提取时间戳
                        currentText = '';
                        wordStart = false;
                    } else {
                        currentText += part;
                        if (/\s/.test(part)) wordStart = true; // 空格后为新词
                    }
                }
                if (currentText) {
                    words.push({ text: currentText, isSpace: /\s/.test(currentText) });
                    timestamps.push(null);
                }

                // 重新分词以符合现有规则
                const reSplitWords = splitWords(words.map(w => w.text).join(''));
                const nonSpaceCount = reSplitWords.filter(w => !w.isSpace).length;
                const lyricLine = {
                    timestamp: timestamp,
                    words: reSplitWords,
                    timestamps: new Array(nonSpaceCount).fill(null),
                    timestampMap: new Map(),
                    endTimestamp: endTimestamp
                };

                // 填充逐字时间戳
                let tsIdx = 0;
                let origTsIdx = 0;
                lyricLine.words.forEach((word, i) => {
                    if (!word.isSpace) {
                        if (tsIdx < timestamps.length && timestamps[tsIdx] && origTsIdx > 0) {
                            lyricLine.timestamps[tsIdx] = timestamps[tsIdx]; // 保留 SPL 时间戳
                        }
                        lyricLine.timestampMap.set(i, tsIdx++);
                        origTsIdx++;
                    }
                });

                lyrics.push(lyricLine);
            }
        }
    } else {
        // TXT 格式解析：默认时间戳为 00:00.00
        for (let line of lines) {
            const words = splitWords(line);
            const nonSpaceCount = words.filter(w => !w.isSpace).length;
            const lyricLine = {
                timestamp: '00:00.00', // 默认从 0 开始
                words: words,
                timestamps: new Array(nonSpaceCount).fill(null),
                timestampMap: new Map(),
                endTimestamp: null
            };
            updateTimestampMap(lyricLine);
            lyrics.push(lyricLine);
        }
    }

    // 如果解析为空，使用文件名作为默认歌词
    if (lyrics.length === 0) {
        const words = splitWords(fileName);
        const nonSpaceCount = words.filter(w => !w.isSpace).length;
        lyrics.push({
            timestamp: '00:00.00',
            words: words,
            timestamps: new Array(nonSpaceCount).fill(null),
            timestampMap: new Map(),
            endTimestamp: null
        });
        updateTimestampMap(lyrics[0]);
    }
}

// 分词函数：按 CJK 字符、拉丁字母（含 '）和空格分词
function splitWords(text) {
    const cjkRegex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/; // 中日韩字符正则
    const latinRegex = /[A-Za-zÀ-ÿ0-9']/; // 拉丁字母、数字及 ' 正则
    let words = [];
    let currentWord = '';
    let prevCharIsSpace = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const isCJK = cjkRegex.test(char);
        const isLatin = latinRegex.test(char);
        const isSpace = /\s/.test(char);

        if (isSpace) {
            // 空格处理：多空格合并为一个
            if (!prevCharIsSpace && currentWord) {
                words.push({ text: currentWord, isSpace: false });
                currentWord = '';
            }
            if (!prevCharIsSpace) words.push({ text: ' ', isSpace: true });
            prevCharIsSpace = true;
        } else if (isCJK) {
            // CJK 字符单独分词
            if (currentWord) {
                words.push({ text: currentWord, isSpace: false });
                currentWord = '';
            }
            words.push({ text: char, isSpace: false });
            prevCharIsSpace = false;
        } else if (isLatin) {
            // 拉丁字母及 ' 累积为单词
            currentWord += char;
            prevCharIsSpace = false;
        } else {
            // 其他字符（如标点）单独分词
            if (currentWord) {
                words.push({ text: currentWord, isSpace: false });
                currentWord = '';
            }
            words.push({ text: char, isSpace: false });
            prevCharIsSpace = false;
        }
    }
    if (currentWord) words.push({ text: currentWord, isSpace: false }); // 处理最后一个单词
    return words;
}

// 更新 timestampMap：为非空格词分配索引
function updateTimestampMap(line) {
    let idx = 0;
    line.timestampMap.clear();
    line.words.forEach((w, i) => {
        if (!w.isSpace) line.timestampMap.set(i, idx++); // 只为非空格词生成映射
    });
}

// 渲染歌词到编辑区
function renderLyrics() {
    const section = document.getElementById('lyricsSection');
    section.innerHTML = '<h3>歌词编辑</h3>'; // 清空并添加标题
    lyrics.forEach((line, lineIndex) => {
        const div = document.createElement('div');
        div.className = 'lyrics-line';
        div.innerHTML = `<span>[${line.timestamp}]</span>`; // 显示行起始时间戳
        line.words.forEach((word, wordIndex) => {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = word.text;
            if (!word.isSpace) {
                span.onclick = () => restartFromWord(lineIndex, wordIndex); // 左键重新打轴
                span.oncontextmenu = (e) => showContextMenu(e, lineIndex, wordIndex); // 右键菜单
            }
            div.appendChild(span);
        });
        section.appendChild(div);
    });
}

// 显示右键菜单
function showContextMenu(e, lineIndex, wordIndex) {
    e.preventDefault();
    hideContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `<div onclick="resegmentWord(${lineIndex}, ${wordIndex})">重新分词</div>`;
    menu.style.top = `${e.pageY}px`;
    menu.style.left = `${e.pageX}px`;
    document.body.appendChild(menu);
}

// 隐藏右键菜单
function hideContextMenu() {
    const menu = document.querySelector('.context-menu');
    if (menu) menu.remove();
}

// 重新分词：允许用户手动调整分词
function resegmentWord(lineIndex, wordIndex) {
    const line = lyrics[lineIndex];
    const word = line.words[wordIndex];
    const originalText = word.text;
    const newText = prompt('请用斜杠（/）分隔词，例如 "Tears" 可分为 "Te/ars"', originalText);
    if (newText && newText !== originalText) {
        const newWords = newText.split('/').map(text => ({ text, isSpace: false }));
        const oldTimestamp = line.timestamps[line.timestampMap.get(wordIndex)];
        line.words.splice(wordIndex, 1, ...newWords); // 替换原词
        // 更新 timestampMap 和 timestamps
        const nonSpaceWords = line.words.filter(w => !w.isSpace);
        line.timestampMap.clear();
        line.timestamps = new Array(nonSpaceWords.length).fill(null);
        let tsIdx = 0;
        line.words.forEach((w, i) => {
            if (!w.isSpace) line.timestampMap.set(i, tsIdx++);
        });
        if (oldTimestamp) {
            line.timestamps[line.timestampMap.get(wordIndex)] = oldTimestamp; // 保留时间戳
        }
        renderLyrics();
        highlightCurrentWord();
    }
    hideContextMenu();
}

// 高亮当前待标记的词并在行切换时滚动
function highlightCurrentWord() {
    const allWords = document.querySelectorAll('.word');
    allWords.forEach(w => w.classList.remove('active', 'tagged')); // 清除所有高亮
    
    // 遍历所有歌词行，设置 tagged 类
    lyrics.forEach((line, lIdx) => {
        line.words.forEach((word, wIdx) => {
            const wordEl = document.querySelectorAll('.lyrics-line')[lIdx].querySelectorAll('.word')[wIdx];
            if (!word.isSpace) {
                const wordIdx = line.timestampMap.get(wIdx);
                // 判断词是否拥有起始时间（tagged 的唯一条件）
                const hasStartTime = (wordIdx === 0 && line.timestamp) || // 行首词使用 line.timestamp
                    (wordIdx !== undefined && line.timestamps[wordIdx]); // 非行首词使用 timestamps
                if (hasStartTime) {
                    wordEl.classList.add('tagged'); // 有起始时间则赋 tagged
                }
            }
        });
    });
    
    // 高亮当前操作对象（active 基于 currentLineIndex 和 currentWordIndex）
    if (currentLineIndex < lyrics.length) {
        const currentLine = lyrics[currentLineIndex];
        // 仅当 currentWordIndex 在有效范围内，且该词未完全打轴时赋 active
        if (currentWordIndex < currentLine.timestamps.length) {
            let nonSpaceCount = 0;
            for (let i = 0; i < currentLine.words.length; i++) {
                if (!currentLine.words[i].isSpace) {
                    if (nonSpaceCount === currentWordIndex) {
                        const currentWordEl = document.querySelectorAll('.lyrics-line')[currentLineIndex].querySelectorAll('.word')[i];
                        const wordIdx = currentLine.timestampMap.get(i);
                        // 如果是行末词且已有起始时间，不赋 active（等待第二次打轴）
                        if (wordIdx !== currentLine.timestamps.length - 1 || !currentLine.timestamps[wordIdx]) {
                            currentWordEl.classList.add('active'); // 当前操作对象赋 active
                        }
                        break;
                    }
                    nonSpaceCount++;
                }
            }
        }
        // 仅在行切换时滚动
        if (lastScrolledLine !== currentLineIndex) {
            const currentLineEl = document.querySelectorAll('.lyrics-line')[currentLineIndex];
            currentLineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastScrolledLine = currentLineIndex;
        }
    }
    updateOutput(); // 更新 SPL 输出
}

// 高亮当前播放行（不滚动）
function highlightCurrentLine() {
    const lines = document.querySelectorAll('.lyrics-line');
    lines.forEach((line, idx) => {
        line.classList.remove('active');
        const ts = lyrics[idx].timestamp.split(/[:.]/);
        const time = parseInt(ts[0]) * 60 + parseInt(ts[1]) + parseInt(ts[2]) / 100; // 将时间戳转换为秒
        if (audio.currentTime >= time && (idx === lyrics.length - 1 || audio.currentTime < parseTime(lyrics[idx + 1].timestamp))) {
            line.classList.add('active'); // 高亮当前播放行
        }
    });
}

// 标记当前词的时间戳（包含行首和行尾特殊逻辑）
function tagCurrentWord() {
    if (currentLineIndex >= lyrics.length) return;
    const line = lyrics[currentLineIndex];

    const time = audio.currentTime;
    const formattedTime = formatTimestamp(time);

    // 单词行（仅一个词）
    if (line.timestamps.length === 1) {
        if (!line.timestamps[0]) {
            // 第一次打轴：设置起始时间
            line.timestamp = formattedTime; // 行起始时间即词起始时间
            line.timestamps[0] = formattedTime; // 同步更新 timestamps[0]
            currentWordIndex = 0; // 保持在当前词，等待第二次打轴
        } else if (!line.endTimestamp) {
            // 第二次打轴：设置结束时间并跳转
            line.endTimestamp = formattedTime;
            if (currentLineIndex < lyrics.length - 1) {
                currentLineIndex++; // 跳转到下一行
                currentWordIndex = 0; // 重置为行首词
            }
        }
    }
    // 多词行
    else {
        if (currentWordIndex >= line.timestamps.length) return;

        // 行首字：同步修改行起始时间并移动到下一个词
        if (currentWordIndex === 0) {
            line.timestamp = formattedTime; // 更新行起始时间（即行首词起始时间）
            currentWordIndex++; // 移动到下一个操作对象
        }
        // 行尾字：第一次记录起始时间并等待第二次，第二次记录行结尾时间并跳转
        else if (currentWordIndex === line.timestamps.length - 1) {
            if (!line.timestamps[currentWordIndex]) {
                line.timestamps[currentWordIndex] = formattedTime; // 第一次按下记录起始时间
                // 不移动 currentWordIndex，等待第二次打轴
            } else if (!line.endTimestamp) {
                line.endTimestamp = formattedTime; // 第二次按下记录行结尾时间
                if (currentLineIndex < lyrics.length - 1) {
                    currentLineIndex++; // 跳转到下一行
                    currentWordIndex = 0; // 重置为行首词
                }
            }
        }
        // 中间词：正常打轴并移动到下一个词
        else {
            line.timestamps[currentWordIndex] = formattedTime; // 记录起始时间
            currentWordIndex++; // 移动到下一个操作对象
        }
    }

    highlightCurrentWord(); // 更新高亮状态
}

// 从某个词重新开始打轴（确保移除时间戳时更新 tagged）
function restartFromWord(lineIndex, wordIndex) {
    const line = lyrics[lineIndex];
    let nonSpaceCount = 0;
    for (let i = 0; i < line.words.length; i++) {
        if (!line.words[i].isSpace && i <= wordIndex) {
            nonSpaceCount++; // 计算非空格词数量
        }
    }
    currentLineIndex = lineIndex;
    currentWordIndex = nonSpaceCount - 1; // 设置当前词索引
    line.timestamps.fill(null, currentWordIndex); // 清除后续时间戳
    line.endTimestamp = null; // 清除行结尾时间
    for (let i = lineIndex + 1; i < lyrics.length; i++) {
        lyrics[i].timestamps.fill(null); // 清除后续行的所有时间戳
        lyrics[i].endTimestamp = null;
    }
    highlightCurrentWord(); // 更新高亮，确保移除时间戳后 tagged 被移除
}

// 解析时间戳为秒数
function parseTime(timestamp) {
    const ts = timestamp.split(/[:.]/);
    return parseInt(ts[0]) * 60 + parseInt(ts[1]) + parseInt(ts[2]) / 100; // 转换为秒
}

// 格式化时间戳为 [mm:ss.ff] 格式
function formatTimestamp(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.round((seconds % 1) * 100); // 保留两位小数
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
}

// 更新 SPL 输出（使用方括号格式）
function updateOutput() {
    const output = lyrics.map(line => {
        let result = `[${line.timestamp}]`; // 行起始时间戳
        let tsIdx = 0;
        line.words.forEach((word, i) => {
            if (!word.isSpace) {
                const wordIdx = line.timestampMap.get(i);
                if (wordIdx === 0) {
                    result += word.text; // 行首词不重复时间戳
                } else if (line.timestamps[wordIdx]) {
                    result += `[${line.timestamps[wordIdx]}]${word.text}`; // 非行首词添加时间戳
                } else {
                    result += word.text;
                }
                tsIdx++;
            } else {
                result += word.text; // 空格直接添加
            }
        });
        if (line.endTimestamp) {
            result += `[${line.endTimestamp}]`; // 添加行结尾时间戳
        }
        return result;
    }).join('\n');
    document.getElementById('outputLrc').value = output; // 更新输出文本框
}

// 复制 SPL 到剪贴板
function copyToClipboard() {
    const textarea = document.getElementById('outputLrc');
    textarea.select();
    document.execCommand('copy'); // 复制选中文本
    alert('已复制到剪贴板');
}

// 下载 SPL 文件
function downloadSpl() {
    const text = document.getElementById('outputLrc').value;
    const blob = new Blob([text], { type: 'text/plain' }); // 创建文本 Blob
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lyrics.spl'; // 设置下载文件名
    link.click();
}