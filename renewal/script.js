// 初始化全局变量
// 音频播放对象
let audio = new Audio();
// 歌词源文本，供中途修改
let lyricText = '';
// 歌词数据对象，存储解析后的歌词
let lyric = new Object();


// 添加音频操作
function addActionForAudio() {
    // 获取节点
    const audioChooser = document.getElementById('audio-chooser');
    const audioInput = document.getElementById('audio-input');
    const audioControllers = document.querySelectorAll('.controller');

    // 节流
    function throttle(fn, delay) {
        let lastTime = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastTime >= delay) {
                fn(...args);
                lastTime = now;
            }
        };
    }

    // 根据状态更新暂停按钮的图标
    function updatePauseIcon(isPlaying, conPause) {
        conPause.icon = isPlaying ? 'pause--outlined' : 'play_arrow--outlined';
    }

    // 处理音频控制器事件
    function setupAudioControllers(audioFile) {
        // 创建对象
        const audio = new Audio(URL.createObjectURL(audioFile));

        // 获取总时长
        let duration;
        audio.addEventListener('loadedmetadata', () => {
            duration = audio.duration;
        });

        // 绑定事件
        // 获取节点
        const conPause = document.getElementById('controller-pause');
        const conBackward = document.getElementById('controller-backward');
        const conForward = document.getElementById('controller-forward');
        const conProgress = document.getElementById('controller-progress');
        const conSpeed = document.getElementById('controller-speed');

        // 暂停
        conPause.addEventListener('click', () => {
            const isPlaying = !audio.paused && !audio.ended;
            isPlaying ? audio.pause() : audio.play();
        });
        // 更新
        audio.addEventListener('play', () => updatePauseIcon(true, conPause));
        audio.addEventListener('pause', () => updatePauseIcon(false, conPause));
        audio.addEventListener('ended', () => {
            updatePauseIcon(false, conPause);
            conProgress.value = 0;
            audio.currentTime = 0;
        });

        // 步退
        conBackward.addEventListener('click', () => {
            audio.currentTime -= 5;
        });

        // 步进
        conForward.addEventListener('click', () => {
            audio.currentTime += 5;
        });

        // 进度条
        // 显示
        function formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        conProgress.labelFormatter = (value) => formatTime(value);
        // 更新
        audio.addEventListener('timeupdate', throttle(() => {
            if (duration) {
                conProgress.value = (audio.currentTime / duration) * 100;
            }
        }, 1000));
        // 操作
        conProgress.addEventListener('change', () => {
            if (duration) {
                audio.currentTime = duration * (conProgress.value / 100);
            }
        });

        // 倍速
        conSpeed.addEventListener('click', () => {

        });

        // 允许控制
        audioControllers.forEach(controller => controller.disabled = false);
    }
    
    // 输入元素值改变时加载音频
    audioInput.addEventListener('change', (event) => {
        const audioFile = event.target.files[0];
        if (audioFile) {
            setupAudioControllers(audioFile);
        }
    });
    
    // 文件选择
    audioChooser.addEventListener('click', () => {
        audioInput.click();
    });
}

// 添加歌词选择
function addActionForLyric() {
    const lyricChooser = document.getElementById('lyric-chooser');
    const lyricInput = document.getElementById('lyric-input');
    lyricInput.addEventListener('change', function(event) {
        const lyricFile = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            lyricText = e.target.result;
        };
        reader.readAsText(lyricFile);
    });
    lyricChooser.addEventListener('click', function() {
        lyricInput.click();
    });

    const lyricEditor = document.getElementById('lyric-editor');
    const lyricEditorDialog = document.getElementById('lyric-editor-dialog');
    const cancelButton = lyricEditorDialog.querySelector('mdui-button.cancel');
    cancelButton.addEventListener('click', () => lyricEditorDialog.open = false);
    const submitButton = lyricEditorDialog.querySelector('mdui-button.submit');
    const lyricContent = lyricEditorDialog.querySelector('mdui-text-field.content');
    submitButton.addEventListener('click', function () {
        lyricText = lyricContent.value;
        lyricEditorDialog.open = false;
    });
    lyricEditor.addEventListener('click', function() {
        lyricContent.value = lyricText;
        lyricEditorDialog.open = true;
    })
}


window.addEventListener('load', function() {
    addActionForAudio();
    addActionForLyric();
});