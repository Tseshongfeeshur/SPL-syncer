let currentMsgIndex = 0;
helpMsg = [
    // 第一条不要加强调元素，否则此时退出不解除。
    {
        'content': '向导可以帮助您了解该工具的使用方法。\n\n单击“下一步”以开始向导，单击“去看看”以退出向导。在向导过程中，您可以随时退出。',
        'elements': []
    },
    {
        'content': '在向导过程中，我们会通过对话框描述操作方法，使用闪烁的边框标记操作位置。\n\n向导过程中，单击“去看看”以完成当前操作；完成当前操作后，单击右上角“?”重新打开向导对话框，单击“下一步”以继续。',
        'elements': ['helper']
    },
    {
        'content': '在同步歌词前，您需要事先加载资源文件。\n\n资源文件包括音频（您的歌曲）和待同步的歌词。\n\n对于音频，您可以选择 MP3、FLAC、M4A 等浏览器支持的任何格式；对于歌词，您可以选择 LRC 歌词、无时间戳的纯文本歌词和使用“[]”标记时间戳的 SPL 歌词。也就是说，将通过本工具同步后的歌词导出后，您可以再次将其无损地导入。',
        'elements': []
    },
    {
        'content': '现在请您单击右上角的“+”按钮打开菜单，单击菜单中的“加载音频”，然后选择一个音频文件。',
        'elements': ['uploader', 'audio-chooser']
    },
    {
        'content': '音频选择完成后，底部应用栏的控制按钮应可以使用，您可以点击“播放”按钮尝试播放音频。',
        'elements': ['controller-pause']
    },
    {
        'content': '若您确定音频加载成功，现在请您再次单击右上角的“+”按钮打开菜单，单击菜单中的“加载歌词”，然后选择一个歌词文件。\n\n您也可以点击“编辑歌词”，然后直接将歌词粘贴在弹窗中并提交。',
        'elements': ['uploader', 'lyric-chooser']
    },
    {
        'content': '歌词选择 / 输入完成后，应被自动解析、分词，并呈现在页面中。您应当看到页面中加载了一个由单字 / 单词构成的列表。',
        'elements': []
    },
    {
        'content': '若您确定音频和歌词都加载成功，现在您可以开始同步您的歌词。\n\n请您先单击“播放”键播放音频，然后等待前奏结束，在歌手唱出第一个字的一瞬间按下右下角的“标记”键。',
        'elements': ['controller-pause', 'controller-tag']
    },
    {
        'content': '非常好，您完成了第一个字的同步。\n\n如您所见，已有起始时间戳的词会着色显示，带有环形加载动画的词是下一个词（注意，带有环形加载动画的词是当前正在演唱词的下一个词，不是正在演唱的词），没有起始时间戳的词只显示边框。',
        // 强调动画有布局错误，但影响不大
        'elements': ['line-0-item-0', 'line-0-item-1', 'line-0-item-2']
    },
    {
        'content': '接下来，请您按照相同的方法，在每个字的开始时刻按下“标记”键，直至完成第一行（最后一个词的加载动画结束）。\n\n完成第一行后，请您返回向导，查看接下来的操作。',
        'elements': ['line-0', 'controller-tag']
    },
    {
        'content': '现在您应快要完成第一行。这就是说，您已为第一行的每个字标记了起始时间戳。\n\n接下来要标记该行的末尾时间戳，请您在歌手唱完该行最后一个字的一瞬间按下“标记”键。',
        'elements': ['line-0', 'controller-tag']
    },
    {
        'content': '当该行的末尾时间戳标记完成时，才算真正完成该行的同步，开始下一行的同步。\n\n现在您已清楚同步歌词的基本规则，请您按部就班地同步歌词，直到歌曲结束。每一行都需要标记每个字的起始时间戳和该行的末尾时间戳。',
        'elements': ['controller-tag']
    },
    {
        'content': '若您在同步过程中分散了注意力，导致局部标记不准确，您可以点击不准确的单词，并连击步退按钮 / 拖动进度条以回到该单词前的时刻，然后等待歌手演唱该词，届时按下“标记”按键，重新标记该词的起始时间。\n\n若您认为歌词不对 / 自动分词不太恰当，您可以单击所在行，在对话框中使用“/”重新分词（注意，该操作会丢失该行所有时间戳）。\n\n若错误面积较大 / 您需要更高级的修改，您可以使用右上角“+”菜单中的“编辑歌词”功能编辑整份歌词（注意，该功能会重新解析整份歌词，因此您会丢失所有您新增的时间戳）。',
        'elements': ['controller-backward', 'controller-tag', 'uploader', 'lyric-editor']
    },
    {
        'content': '整首歌曲同步完成后，您可以单击底部应用栏的“复制”按钮以复制成品 SPL 歌词。\n\n随后，您可以将其制作为外挂歌词，或直接嵌入音频文件以便加载。',
        'elements': ['copy-spl']
    },
    {
        'content': '在同步过程中，您可能希望更快速 / 更便捷地操作，或者您可能使用键盘和鼠标，难以频繁点击按钮。因此，我们提供了以下快捷键映射。\n\n左手：\nS → 步退 2 秒\nD → 播放 / 暂停\nF → 步进 2 秒\n\n右手：\nI → 使焦点回到上一行\nJ → 使焦点回到上一个词\nK → 标记\nL → 使焦点跳转到下一个词\nM → 使焦点跳转到下一行\n\n您仅需如常摆放双手，即可方便地使用左手控制播放，使用右手控制同步。',
        'elements': []
    },
    // 最后一条不要加强调元素，否则永远无法解除。
    {
        'content': '您已完成向导，祝您使用愉快！🥳🌹', 
        'elements': []
    }
]

function showHelp() {
    function showDialog(currentMsgIndex) {
        const dialog = mdui.confirm({
            headline: `向导（${currentMsgIndex + 1} / ${helpMsg.length}）`,
            description: helpMsg[currentMsgIndex].content,
            confirmText: "下一步",
            cancelText: "去看看",
            onConfirm: nextHelp,
            // 曲线标记
            closeOnEsc: true
        });
        const lastElements = helpMsg[Math.max(0, currentMsgIndex - 1)].elements;
        if (lastElements) {
            for (let element of lastElements) {
                const target = document.getElementById(element);
                if (!target) continue;
                target.classList.remove('blink');
            }
        }
        const currentElements = helpMsg[currentMsgIndex].elements;
        if (currentElements) {
            for (let element of currentElements) {
                const target = document.getElementById(element);
                if (!target) continue;
                target.classList.add('blink');
                // 曲线计算圆角
                const targetBorderRadius = window.getComputedStyle(target).borderRadius;
                const targetRadiusValue = targetBorderRadius === '0px' ? 0 : parseFloat(targetBorderRadius);
                const newBorderRadius = `${targetRadiusValue + 8}px`;
                target.style.setProperty('--outline-border-radius', newBorderRadius);
            }
        }
    }
    
    function nextHelp() {
        currentMsgIndex ++;
       - showHelp();
    }
    
    if (currentMsgIndex < helpMsg.length) {
        showDialog(currentMsgIndex);
    } else {
        currentMsgIndex = 0;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const helperButton = document.getElementById('helper');
    helperButton.addEventListener('click', showHelp);
});