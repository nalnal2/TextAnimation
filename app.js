// express server setting
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
server.listen(3000, '192.168.81.1', function() {
    console.log('Connected, 3000 port..!');
});

// library loading
var path = require('path');
var multer = require('multer');
var pythonShell = require('python-shell');
var fs = require('fs');
var bodyParser = require('body-parser');
var _storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
var upload = multer({ storage: _storage });
var findRemoveSync = require('find-remove');

// server directory enabled
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/', express.static(__dirname + '/'));
app.use('/view', express.static(__dirname + '/view'));
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use('/python_output', express.static(__dirname + '/python_output'));
app.use('/script', express.static(__dirname + '/script'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/fonts', express.static(__dirname + '/fonts'));
app.locals.pretty = true;

// python input variable
var userfile = '',
    language = '',
    python_mode = 1,
    head = 1,
    tail = 1000,
    unit = 1000,
    python_exeTime = 1;

// variable declaration
var options_pre, options_ed,
    checkEnd = -1;

    // routing
    app.get('/home', function(req, res) {
    	res.sendFile((path.join(__dirname + '/startbootstrap-coming-soon-gh-pages/index.html')));
    });

    app.get('/upload', function(req, res) {
        res.sendFile((path.join(__dirname + '/view/upload.html')));
    });

    app.get('/result', function(req, res) {
        res.sendFile((path.join(__dirname + '/view/force_new.html')));
    });

    app.get('/help', function(req, res) {
        res.sendFile((path.join(__dirname + '/view/help.html')));
    });

    app.get('/temp', function (req, res) {
        res.sendFile((path.join(__dirname + '/view/force_manual.html')));
    });

    app.get('/test', function (req, res) {
    	res.sendFile((path.join(__dirname + '/startbootstrap-coming-soon-gh-pages/index_test.html')));
    });

    app.get('/ani', function (req, res) {
        res.sendFile((path.join(__dirname + '/view/force_ani.html')));
    });

    app.get('/demo', function (req, res) {
    	res.sendFile((path.join(__dirname + '/startbootstrap-coming-soon-gh-pages/index_demo.html')));
    });

    app.get('/demo2', function (req, res) {
        res.sendFile((path.join(__dirname + '/startbootstrap-coming-soon-gh-pages/index_demo2.html')));
    });

// 자동 키워드 분석
app.post('/upload', upload.single('userfile'), function(req, res) {
    console.log(req.file);
    userfile = req.file.filename;
    userfile = userfile.replace('.txt', '').replace('.TXT', '');
    res.sendFile((path.join(__dirname + '/view/force.html')));
});
// 사용자가 키워드 파일을 직접 입력
app.post('/upload_manual', upload.fields([{name: 'userfile_text', maxCount: 1}, {name: 'userfile_keyword', maxCount: 1}]),
function (req, res) {
    console.log(req.files);
    userfile = req.files['userfile_text'][0].filename;
    userfile = userfile.replace('.txt', '').replace('.TXT', '');
    // /data/[userfile] 디렉토리 생성 및 텍스트, 키워드 파일 복사
    checkDirNCopy(userfile);
    res.sendFile((path.join(__dirname + '/view/force_tts.html'))); // force_new
});

app.post('/upload_test', upload.fields([{name: 'userfile_text', maxCount: 1}, {name: 'userfile_keyword', maxCount: 1}]),
function (req, res) {
    console.log(req.files);
    userfile = req.files['userfile_text'][0].filename;
    userfile = userfile.replace('.txt', '').replace('.TXT', '');
	console.log(userfile);
    checkDirNCopy(userfile);
    res.sendFile((path.join(__dirname + '/view/force_test.html')));
});

app.post('/upload_demo', upload.fields([{name: 'userfile_text', maxCount: 1}, {name: 'userfile_keyword', maxCount: 1}]),
function (req, res) {
    console.log(req.files);
    userfile = req.files['userfile_text'][0].filename;
    userfile = userfile.replace('.txt', '').replace('.TXT', '');
	console.log(userfile);
    checkDirNCopy(userfile);
    res.sendFile((path.join(__dirname + '/view/force_tts_demo.html')));
});

app.post('/upload_demo2', upload.fields([{name: 'userfile_text', maxCount: 1}, {name: 'userfile_keyword', maxCount: 1}]),
function (req, res) {
    console.log(req.files);
    userfile = req.files['userfile_text'][0].filename;
    userfile = userfile.replace('.txt', '').replace('.TXT', '');
	console.log(userfile);
    checkDirNCopy(userfile);
    res.sendFile((path.join(__dirname + '/view/force_tts_demo2.html')));
});

// socket listening
io.on('connection', function (client) {
    console.log('Client connected..');
    client.on('set document language', function (data) {
        language = data;
    });
    client.on('request static-graph', function (data) {
        options_pre = {
            mode: 'text',
            pythonPath: 'python',
            pythonOptions: ['-u'],
            scriptPath: '',
            args: [userfile, language]
        };
        console.log(options_pre);
        pythonShell.run('pre_processer0.1.py', options_pre, function (err, results) {
            if (err) throw err;
            console.log('pre_processer0.1 executed');
            python_mode = 1; // static-graph mode
            // set execute options
            options_ed = {
                mode: 'text',
                pythonPath: 'python',
                pythonOptions: ['-u'],
                scriptPath: '',
                args: [userfile, python_mode, head, tail, unit]
            };
            // run python program
            pythonShell.run('ed_processer2.1.py', options_ed, function (err, results) {
                if (err) throw err;
                console.log('static mode - ed_processer2.1 executed - results: %j', results);
                io.to(client.id).emit('static-graph prepared', userfile); console.log('static-graph prepared');
            });
        });
    });
    client.on('request static-graph manually', function (data) {
        options_pre = {
            mode: 'text',
            pythonPath: 'python',
            pythonOptions: ['-u'],
            scriptPath: '',
            args: [userfile, language]
        };
        console.log(options_pre);
        pythonShell.run('pre_processer0.1.py', options_pre, function (err, results) {
            options_ed = {
                mode: 'text',
                pythonPath: 'python',
                pythonOpions: ['-u'],
                scriptPath: '',
                args: [userfile, 1, 1, 1, 1]
            };
            pythonShell.run('ed_processer2.1.py', options_ed, function (err, results) {
                if (err) throw err;
                console.log('static mode - ed_processer2.1 executed -results: %j', results);
                io.to(client.id).emit('static-graph prepared', userfile); console.log('static-graph prepared');
            });
        });
    });
    // original version of animation
    client.on('request animation', function (data) {
        // remove previous datas if part_text & graph dir. exists
        if (fs.existsSync('./part_text/'+userfile)) {
            var result = findRemoveSync('./part_text/'+userfile, {extensions: ['.txt']});
            result = findRemoveSync('./graph/'+userfile, {extensions: ['.js'], ignore: userfile+'_graph.js'});
        }
        // set received datas
        head = data[0],
        tail = data[1],
        unit = data[2],
        python_mode = 0; // dynamic-graph mode
        // set python execute options
        options_ed = {
            mode: 'text',
            pythonPath: 'python',
            pythonOptions: ['-u'],
            scriptPath: '',
            args: [userfile, python_mode, head, tail, unit]
        };
        // run python program
        pythonShell.run('ed_processer2.1.py', options_ed, function (err, results) {
            if (err) throw err;
            console.log('animation mode - ed_processer2.1 executed');
            io.to(client.id).emit('animation prepared', language);
        });
    });
    // animation with standard deviation
    client.on('request animation2', function (data) {
        // set received datas
        head = data[0],
        tail = data[1],
        unit = data[2],
        python_mode = 2; // dynamic-graph mode
        // set python execute options
        options_ed = {
            mode: 'text',
            pythonPath: 'python',
            pythonOptions: ['-u'],
            scriptPath: '',
            args: [userfile, python_mode, head, tail, unit]
        };
        // run python program
        pythonShell.run('ed_processer2.2.py', options_ed, function (err, results) {
            if (err) throw err;
            console.log('animation mode - ed_processer2.2 executed');
            io.to(client.id).emit('animation2 prepared', results);
        });
    });
});
io.on('disconnection', function (client) {
    console.log('Client disconnected..');
})

function checkDirNCopy(userfile) {
    // if dir. not exists, then create the dir.
    if (!fs.existsSync('./data/'+userfile)) {
        fs.mkdirSync('./data/'+userfile);
    }
    // copy user-input file from ./uploads to dir. just created
    fs.createReadStream('./uploads/'+userfile+'.txt').pipe(fs.createWriteStream('./data/'+userfile+'/'+userfile+'.txt'));
    fs.createReadStream('./uploads/'+userfile+'_key.txt').pipe(fs.createWriteStream('./data/'+userfile+'/'+userfile+'_key.txt'));
}
