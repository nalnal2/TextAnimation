const CREATED = 1;
const NORMAL = 0;
const DISAPPEARED = -1;

var voices = window.speechSynthesis.getVoices();

var socket = io.connect(); // socket io setting
var vertex_n, edge_n; // graph info. var.
var head, tail, unit, numOfLine; // slider var.

var changes = {
    sizeChangedNodes: [], // {id, newSize}
    createdNodes: [], // Node{id, label, size}
    createdLinks: [], // Link{id, size, source, target}
    disappearedNodes: [], // nodeID
    disappearedLinks: [] // linkID
};

var graph_prev = {},
    graph_cur = {},
    graph_fut = {},
    graph_toDraw = {};
var graph_num = -1;

// default var. for showing graph
var default_nodeNLimit = 20,
    default_linkNLimit = 9,
    default_whole_linkNLimit = 10,
    default_singleOutChecked = true;

// user set var.
var nodeNLimit = default_nodeNLimit,
    linkNLimit = default_linkNLimit,
    whole_linkNLimit = default_whole_linkNLimit,
    singleOutChecked = default_singleOutChecked;

// user input file
var userfile,
    language;

// max node(label) size & max node num.
var nodeMaxSize_shown = 15,
    labelMaxSize_shown = 15,
    nodeIDmax = 100;

// size of force layout
var width = 660,
    height = 650;

// force simulation var.
var svg, g,
    simulation, link_force,
    link, node, label;

var drag_handler = d3.drag()
        .on("start", function (d) {
            if (!d3.event.active) simulation.alphaTarget(0.5).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on("drag", function (d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        })
        .on("end", function (d) {
            if (!d3.event.active) simulation.alphaTarget(0.5);
            d.fx = null;
            d.fy = null;
        });

var zoom_handler = d3.zoom()
        .on("zoom", zoom_action);

// ---------------------------------------------------------------------------------------

$(window).load(function () {
    socket.emit("request static-graph manually"); console.log("request static-graph manually");
});

// start drawing static graph
socket.on("static-graph prepared", function (data) {
    userfile = data;
    console.log("start static-graph");
    showGraph();
    showInfo();
    setRangeUnit();
    setTimeout(function () {
        showGraphInfo();
    }, 300);
});

// start animation - need to complete the code
socket.on("animation prepared", function (_lang) {
    console.log("animation prepared");
    if (_lang == "kr") {
        language = "ko-KR";
    } else {
        language = "en-US";
    }
    d3.selectAll("svg").remove();
    prepareForce();
    ani_loop2();
});

// ---------------------------------------------------------------------------------------

function ani_pause() {
	speechSynthesis.pause();
}

function ani_resume() {
	speechSynthesis.resume();
}

// redraw static graph with new drawing-control var.
function redrawGraph() {
    setData();
    d3.selectAll("svg").remove();
    showGraph();
    document.getElementById("nonsingle-vertex-num").value = vertex_n;
    setTimeout(function () {
        showGraphInfo();
    }, 100);
}

function showGraph() {
    // load json data
    d3.json("/graph/" + userfile + "/" + userfile + "_graph.js", function (error, graph) {
        if (error) throw error;
        prepareForce();
        var drawingMethod = document.getElementsByName("drawMode");
        if (drawingMethod[1].checked) {
            ;
        } else {
            single_vertex_num = 0;
            graph = limit_node_num(graph, nodeNLimit);
            graph = limit_link_num(graph, linkNLimit);
            singleOutPermission(graph, singleOutChecked);
        }
        changeSizeByGrade(graph);
        vertex_n = graph.nodes.length;
        edge_n = graph.links.length;

        restart_static(graph);
        drag_handler(node);
        drag_handler(label);
        zoom_handler(svg);
        simulation
            .on("tick", tick_action);
    });
}

function setData () {
    // Control Option�� �Է��� ����� �ɼ��� �ݿ�
    var target1 = document.getElementById("nodeNrange");
    nodeNLimit = target1.options[target1.selectedIndex].value; // --> json������ �� node�� size�� �޸��� �� �ּ� �����ϱ�
    // nodeNLimit = 400; // ���� �ּ� ����, ���� whole_linkNLimit �� �����ؾ�!
    var target2 = document.getElementById("linkNrange");
    whole_linkNLimit = target2.options[target2.selectedIndex].value;
    switch (whole_linkNLimit) {
        case '1':
            whole_linkNLimit = Math.floor(nodeNLimit / 2);
            break;
        case '2':
            whole_linkNLimit = nodeNLimit - 1;
            break;
        case '3':
            whole_linkNLimit = Math.floor(nodeNLimit * 1.5);
            break;
        case '4':
            whole_linkNLimit = nodeNLimit * 2;
            break;
    }
    singleOutChecked = document.getElementsByName("single")[0].checked;
}

function setRangeUnit () {
    // dynamic-graph mode
    var target = document.getElementById("sRange-unit");
    unit = Number(target.options[target.selectedIndex].value);
}

function setSRange () {
    head = Number(document.getElementById("amount1").value);
    tail = Number(document.getElementById("amount2").value);
    graph_num = head;
    $("#slider-range").slider("values", 0, head);
    $("#slider-range").slider("values", 1, tail);
}

function showInfo () {
    $.get("/data/" + userfile + "/" + userfile + "_meta.txt", function (data) {
        var sp_data = data.split("\n");
        var info_data;
        for (i=0; i<sp_data.length; ++i) {
            var temp = sp_data[i].split("=");
            switch (temp[0]) {
                case "%doc_name":
                    info_data = temp[1];
                    document.getElementById("opt-title").value = info_data;
                    break;
                case "%sentence_number":
                    info_data = temp[1];
                    document.getElementById("opt-line").value = info_data;
                    // sRange �ʱ�ȭ ����
                    numOfLine = info_data;
                    showSRange(numOfLine);
                    break;
                case "%word_number":
                    info_data = temp[1];
                    document.getElementById("opt-word").value = info_data;
                    break;
                case "%keword_number":
                    info_data = temp[1];
                    document.getElementById("opt-keyword").value = info_data;
                    break;
                case "%vertex_min":
                    info_data = (temp[1].toString()).substring(0, temp[1].indexOf('.')+3);
                    document.getElementById("v-weight-min").innerHTML = info_data;
                    break;
                case "%vertex_max":
                    info_data = (temp[1].toString()).substring(0, temp[1].indexOf('.')+3);
                    document.getElementById("v-weight-max").innerHTML = info_data;
                    break;
                case "%vertex_avg":
                    info_data = (temp[1].toString()).substring(0, temp[1].indexOf('.')+3);
                    document.getElementById("v-weight-avg").innerHTML = info_data;
                    break;
                case "%vertex_n":
                    info_data = temp[1];
                    document.getElementById("graph-vertex").value = info_data;
                    break;
                case "%edge_min":
                    info_data = (temp[1].toString()).substring(0, temp[1].indexOf('.')+3);
                    document.getElementById("e-weight-min").innerHTML = info_data;
                    break;
                case "%edge_max":
                    info_data = (temp[1].toString()).substring(0, temp[1].indexOf('.')+3);
                    document.getElementById("e-weight-max").innerHTML = info_data;
                    break;
                case "%edge_avg":
                    info_data = (temp[1].toString()).substring(0, temp[1].indexOf('.')+3);
                    document.getElementById("e-weight-avg").innerHTML = info_data;
                    break;
                case "%edge_n":
                    info_data = temp[1];
                    document.getElementById("graph-edge").value = info_data;
                    break;
            }
        }
    });
}

function showGraphInfo () {
    // Load the datas
    var title = document.getElementById("opt-title").value;
    var line = document.getElementById("opt-line").value;
    var dm;
    var drawingMethod = document.getElementsByName("drawMode");
    if (drawingMethod[1].checked) {
        dm = "MST"
    } else {
        dm = "Graph";
    }
    var word = document.getElementById("opt-word").value;
    var keyword= document.getElementById("opt-keyword").value;

    // Insert the datas
    document.getElementById("graph-title").innerHTML = title;
    document.getElementById("graph-line").innerHTML = "S=" + line;
    document.getElementById("graph-dm").innerHTML = "D.M.=" + dm;
    document.getElementById("graph-word").innerHTML = "W=" + word;
    document.getElementById("graph-keyword").innerHTML = "K=" + keyword;
    document.getElementById("graph-vn").innerHTML = "V=" + vertex_n;
    document.getElementById("graph-en").innerHTML = "E=" + edge_n;
    document.getElementById("nonsingle-vertex-num").value = vertex_n;
}

function showSRange (numOfLine) {
    var v1 = Math.floor(Number(numOfLine) / 3);
    var v2 = Math.floor(Number(numOfLine) / 3 * 2);

    // head, tail �ʱ�ȭ
    head = v1;
    tail = v2;
    graph_num = head;

    // slider-range �ʱ�ȭ
    $("#slider-range").slider({
        range: true,
        min: 1,
        max: numOfLine,
        values: [v1, v2],
        slide: function (event, ui) {
            head = ui.values[0], tail = ui.values[1];
			graph_num = head;
            $("#amount1").val(head);
            $("#amount2").val(tail);
        }
    });
    $("#amount1").val($("#slider-range").slider("values", 0));
    $("#amount2").val($("#slider-range").slider("values", 1));

    // slider head & tail ǥ��
    document.getElementById("sRange-head").innerHTML = 1;
    document.getElementById("sRange-tail").innerHTML = numOfLine;
}

// ---------------------------------------------------------------------------------------

// send message for requesting animation to server
function showAnimation () {
    console.log("request animation par.: " + [head, tail, unit]);
    socket.emit("request animation", [head, tail, unit]); console.log("request animation");
}

// need to automatically set animation length sent from ani_loop2 as parameter
function afterLoadJson (error, graphs) {
    if (error) throw error;
    if (graphs.length == 2) {
        graph_cur = graphs[0];
        graph_fut = graphs[1];
        graph_cur = limit_node_num(graph_cur, default_nodeNLimit);
        graph_cur = limit_link_num(graph_cur, default_linkNLimit);
        singleOutPermission(graph_cur, default_singleOutChecked);
        // console.log(JSON.parse(JSON.stringify(graph_cur))); --> �ܼ���� ������Ʈ X
        changeSizeByGrade(graph_cur);
    } else {
        graph_prev = graph_cur;
        graph_cur = graph_fut;
        graph_fut = graphs[0];
    }
    graph_fut = limit_node_num(graph_fut, default_nodeNLimit);
    graph_fut = limit_link_num(graph_fut, default_linkNLimit);
    singleOutPermission(graph_fut, default_singleOutChecked);
    changeSizeByGrade(graph_fut);
    // -------------------------------- for check --------------------------------
    console.log("current graph num: " + graph_num);
    console.log("prev: ");
    console.log(JSON.parse(JSON.stringify(graph_prev)));
    console.log("cur: ");
    console.log(JSON.parse(JSON.stringify(graph_cur)));
    console.log("fut: ");
    console.log(JSON.parse(JSON.stringify(graph_fut)));
    // ---------------------------------------------------------------------------
    make_graphToDraw();
    msgStart();
}

function msgStart () {
    $.get("/part_text/" + userfile + "/" + userfile + "_part_" + graph_num + ".txt", function (data) {
        var msg = new SpeechSynthesisUtterance();
        if (language == "ko-KR") {
            msg.voice = voices[0];
        } else {
            msg.voice = voices[1];
        }
        msg.voiceURI = 'native';
        msg.volume = 1;
        msg.rate = 5;
        msg.pitch = 2;
        msg.lang = language;
        msg.text = data;
        msg.onend = function (event) {
            graph_num += 10;
			if (graph_num + 10 <= tail - unit) {
				ani_loop2();
			}
        }
		console.log(msg.text);
		speechSynthesis.speak(msg);
    });
}

// use setTimeout for automatic play of animation
// need code for automatic setting of graph source and animation length
// and then need to send the length to afterLoadJson
function ani_loop2 () {
    var q = d3.queue();
    if (graph_num == head) {
        q.defer(d3.json, "/graph/" + userfile + "/" + userfile + "_graph_" + graph_num + ".js");
    }
	q.defer(d3.json, "/graph/" + userfile + "/" + userfile + "_graph_" + (graph_num + 10) + ".js"); // load future graph
	q.awaitAll(afterLoadJson);
}

// �� 1 - ���� ���� ���, ��ũ ã�� (prev V.S. cur)
function find_created (prev, cur) {
    // �ʱ�ȭ
    changes.createdNodes = [];
    changes.createdLinks = [];
    changes.sizeChangedNodes = [];

    // ��� cur�� ���(��ũ)�� ����, prev�� ���(��ũ)�� ���ԵǾ��ֳ� ���� �˻�
    // ���Ե����� ���� ���(��ũ) ��ü�� ����
    var prevNodes_id = new Array(),
        prevLinks_id = new Array();
    for (i = 0; i < prev.nodes.length; ++i) {
        prevNodes_id.push(prev.nodes[i].id);
    }
    for (i = 0; i < prev.links.length; ++i) {
        prevLinks_id.push(prev.links[i].id);
    }
    cur.nodes.forEach(function (node) {
        var index;
        if ((index = prevNodes_id.indexOf(node.id)) == -1) {
            // created.created_nodes.push(node);
            changes.createdNodes.push(node);
        } else { // prev -> cur ���� ����ؼ� �����ϴ� �༮
            // (prevNodes_id�� �ε��� ����) == (prev.nodes�� �ε��� ����)
            if (node.size != prev.nodes[index].size) { // ����� ����� ����� id�� ���
                changes.sizeChangedNodes.push({id: node.id, newSize: node.size}); // ���߿� cur.nodes���� �ش� id ����� size�� ������Ʈ
            }
        }
    });
    cur.links.forEach(function (link) {
        if (prevLinks_id.indexOf(link.id) == -1) {
            // created.created_links.push(link);
            changes.createdLinks.push(link);
        }
    });
    // console.log("created: ");
    // console.log(changes.createdNodes);
    // console.log(changes.createdLinks);
}

// �� 2 - ����� ���, ��ũ ã�� (cur V.S. fut)
function find_disappeared (cur, fut) {
    // �ʱ�ȭ
    changes.disappearedNodes = [];
    changes.disappearedLinks = [];

    // ��� cur�� ���(��ũ)�� ����, fut�� ���(��ũ)�� ���ԵǾ��ֳ� ���� �˻�
    // ���Ե����� ���� ���(��ũ)�� id�� ����
    var futNodes_id = new Array(),
        futLinks_id = new Array();
    for (i = 0; i < fut.nodes.length; ++i) {
        futNodes_id.push(fut.nodes[i].id);
    }
    for (i = 0; i < fut.links.length; ++i) {
        futLinks_id.push(fut.links[i].id);
    }
    cur.nodes.forEach(function (node) {
        if (futNodes_id.indexOf(node.id) == -1) {
            // disappeared.disappeared_nodes.push(node.id);
            changes.disappearedNodes.push(node.id);
        }
    });
    cur.links.forEach(function (link) {
        if (futLinks_id.indexOf(link.id) == -1) {
            // disappeared.disappeared_links.push(link.id);
            changes.disappearedLinks.push(link.id);
        }
    });
    // console.log("disappeared: ");
    // console.log(changes.disappearedNodes);
    // console.log(changes.disappearedLinks);
}

// contruct the object of graph_toDraw for the current frame of the animation
function make_graphToDraw () {
    if (graph_num == head) {
        // graph_toDraw�� graph_cur�� �ʱ�ȭ
        graph_toDraw = graph_cur;

        // ����� Ÿ�� null�� �ʱ�ȭ
        graph_toDraw.nodes.forEach(function (node) {
            node.type = NORMAL;
        });
    } else { // graph_prev�� �����ϸ� / graph_num == 1�̸� (�� ��° �ִϸ��̼Ǻ���)
        // created ����
        find_created(graph_prev, graph_cur);

        // disappeared�� �����Ͽ� ���/��ũ ����
        changes.disappearedNodes.forEach(function (nodeID) {
            for (var i = 0; i < graph_toDraw.nodes.length; ++i) {
                if (graph_toDraw.nodes[i].id == nodeID) {
                    graph_toDraw.nodes.splice(i, 1);
                }
            }
        });
        changes.disappearedLinks.forEach(function (linkID) {
            for (var i = 0; i < graph_toDraw.links.length; ++i) {
                if (graph_toDraw.links[i].id == linkID) {
                    graph_toDraw.links.splice(i, 1);
                }
            }
        });

        // ����� Ÿ�� NORMAL�� �ʱ�ȭ
        graph_toDraw.nodes.forEach(function (node) {
            node.type = NORMAL;
        });
        d3.selectAll("circle").style("fill", "#1C1C1C");


        // created�� �����Ͽ� ���/��ũ �߰� & ��忡 Ÿ��(created) ǥ��
        changes.createdNodes.forEach(function (node) {
            node.type = CREATED;
            graph_toDraw.nodes.push(node);
        });
        changes.createdLinks.forEach(function (link) {
            graph_toDraw.links.push(link);
        });
    }

    // disappeared ����
    find_disappeared(graph_cur, graph_fut);

    // dissapeared�� �����Ͽ� ��忡 Ÿ��(disappeared) ǥ��
    changes.disappearedNodes.forEach(function (nodeID) {
        for (var i = 0; i < graph_toDraw.nodes.length; ++i) {
            if (graph_toDraw.nodes[i].id == nodeID) {
                graph_toDraw.nodes[i].type = DISAPPEARED;
            }
        }
    });

    // size ����
    changes.sizeChangedNodes.forEach(function (node) {
        for (var i = 0; i < graph_toDraw.nodes.length; ++i) {
            if (graph_toDraw.nodes[i].id == node.id) {
                graph_toDraw.nodes[i].size = node.newSize;
            }
        }
    });

    console.log("toDraw: ");
    console.log(JSON.parse(JSON.stringify(graph_toDraw)));
    console.log("------------------------------------------------");

    // ������ �׷��� �׸���
    restart();
    drag_handler(node);
    drag_handler(label);
    if (graph_num == head) {
        zoom_handler(svg);
        simulation
            .on("tick", tick_action);
    }

    // part_text �ҷ�����
    $.get("/part_text/" + userfile + "/" + userfile + "_part_" + graph_num + ".txt", function (data) {
        document.getElementById("part-text").innerHTML = data;
    });

    // ����� ǥ��
    var totalFrame = (tail - unit) - head + 1;
    var progressBar = document.getElementById("progressBar");
    var progressVal = Math.floor((graph_num-(head-1)) / totalFrame * 100);
    progressBar.style.width = progressVal + "%";
    document.getElementById("progress-val").innerHTML = progressVal * 1 + "%";

    // ���� frame / ��ü frame ǥ��
    document.getElementById("frame").innerHTML = "F=" + (graph_num-(head-1)) + "/" + totalFrame;

    // created ǥ�� - gray
    changes.createdNodes.forEach(function (node) {
        d3.select($("#"+node.id)[0]).style("fill", "#BDBDBD");
    });
    // disappeared ǥ�� - white
    changes.disappearedNodes.forEach(function (nodeID) {
        d3.select($("#"+nodeID)[0]).style("fill", "#FFFFFF");
    });
    // size ����
    changes.sizeChangedNodes.forEach(function (node) {
        d3.select($("#"+node.id)[0]).attr("r", node.newSize);
    });
}

// ---------------------------------------------------------------------------------------

// set the value of var.: svg, simulation, g, link, node, label
function prepareForce () {
    svg = d3.select("graph").append("svg")
        .attr("id", "graph-svg")
        .attr("class", "canvas")
        .attr("width", "100%")
        .attr("height", height);

    simulation = d3.forceSimulation();
    simulation
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .alphaTarget(1);

    g = svg.append("g")
        .attr("class", "everything");

    link = g.append("g")
        .attr("class", "links")
        .selectAll("line");

    node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle");

    label = g.append("g")
        .attr("class", "labels")
        .selectAll("text");
}

// restart simulation for static graph
function restart_static (graph) {
    link = link.data(graph.links, function (d) { return d.source.id + "-" + d.target.id; });
    // Keep the exiting links connected to the moving ramaining nodes.
    link.exit().transition()
        .attr("stroke-opacity", 0)
        .attrTween("x1", function (d) { return function () { return d.source.x; }; })
        .attrTween("x2", function (d) { return function () { return d.target.x; }; })
        .attrTween("y1", function (d) { return function () { return d.source.y; }; })
        .attrTween("y2", function (d) { return function () { return d.target.y; }; })
        .remove();
    link = link.enter()
            .append("line")
            .call(function (link) { link.transition().attr("stroke-opacity", 1); })
            .attr("stroke", "#898889")
            .attr("stroke-width", 1.5)
            .merge(link);

    node = node.data(graph.nodes, function (d) { return d.id; });
    node.exit().transition()
        .attr("r", 0)
        .remove();
    node = node.enter()
            .append("circle")
            .call(function (node) { node.transition().attr("r", function (d) { return d.size; }); })
            .attr("id", function (d) { return d.id; })
            .attr("stroke", function (d) {
                if (d.size == nodeMaxSize_shown) {
                    return "#00008B";
                } else if (d.size == nodeMaxSize_shown / 3 * 2) {
                    return "#27408B";
                } else {
                    return "#6897BB";
                }
            })
            .style("fill", "#FFFFFF")
            .style("stroke-width", 3)
            .merge(node);

    label = label.data(graph.nodes, function (d) { return d.label; });
    label.exit().remove();
    label = label.enter()
            .append("text")
            .attr("text-anchor", "middle")
            .style("fill", function (d) {
                if (d.size == nodeMaxSize_shown) {
                    return "#000000";
                } else if (d.size == nodeMaxSize_shown / 3 * 2) {
                    return "#0D0D0D";
                } else {
                    return "#262626";
                }
            })
            .style("font-family", "Verdana")
            .style("font-size", function (d) { return labelMaxSize_shown + "px"; })
            .text(function (d) { return d.label; })
            .merge(label);

    simulation.nodes(graph.nodes);
    link_force = d3.forceLink(graph.links).id(function (d) { return d.id; }).distance(100);
    simulation.force("links", link_force);
    simulation.force("links").links(graph.links);
    simulation.alpha(1).restart();
}

// restart simulation for animation
function restart () {
    link = link.data(graph_toDraw.links, function (d) { return d.source.id + "-" + d.target.id; });
    // Keep the exiting links connected to the moving ramaining nodes.
    link.exit().transition()
        .attr("stroke-opacity", 0)
        .attrTween("x1", function (d) { return function () { return d.source.x; }; })
        .attrTween("x2", function (d) { return function () { return d.target.x; }; })
        .attrTween("y1", function (d) { return function () { return d.source.y; }; })
        .attrTween("y2", function (d) { return function () { return d.target.y; }; })
        .remove();
    link = link.enter()
            .append("line")
            .call(function (link) { link.transition().attr("stroke-opacity", 1); })
            .attr("stroke", "#898889")
            .attr("stroke-width", 1.5)
            .merge(link);

    // stroke ��尡 ū ������� - #00008B, #27408B, #6897BB
    node = node.data(graph_toDraw.nodes, function (d) { return d.id; });
    node.exit().transition()
        .attr("r", 0)
        .remove();
    node = node.enter()
            .append("circle")
            .call(function (node) { node.transition().attr("r", function (d) { return d.size; }); })
            .attr("id", function (d) { return d.id; })
            .style("stroke", "#6897BB")
            .style("fill", function (d) {
                if (d.type == NORMAL) {
                    return "#1C1C1C";
                } else if (d.type == CREATED) {
                    return "#BDBDBD";
                } else if (d.type == DISAPPEARED) {
                    return "#FFFFFF";
                } else {
                    return "#FF0000";
                }
            })
            .style("stroke-width", 3)
            .merge(node);

    label = label.data(graph_toDraw.nodes, function (d) { return d.label; });
    label.exit().remove();
    label = label.enter()
            .append("text")
            .attr("text-anchor", "middle")
            .style("fill", function (d) {
                if (d.size == nodeMaxSize_shown) {
                    return "#000000";
                } else if (d.size == nodeMaxSize_shown / 3 * 2) {
                    return "#0D0D0D";
                } else {
                    return "#262626";
                }
            })
            .style("font-family", "Verdana")
            .style("font-size", function (d) { return labelMaxSize_shown + "px"; })
            .text(function (d) { return d.label; })
            .merge(label);

    simulation.nodes(graph_toDraw.nodes);
    link_force = d3.forceLink(graph_toDraw.links).id(function (d) { return d.id; }).distance(100);
    simulation.force("links", link_force);
    simulation.force("links").links(graph_toDraw.links);
    simulation.alpha(1).restart();
}

function zoom_action () {
    g.attr("transform", d3.event.transform);
}

function tick_action () {
    link
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });

    node
        .attr("cx", function (d) {
            if (d.index == 0) {
                damper = 1.5;
                area = 0.01;
                d.x = d.x + (width / 2 - d.x) * damper * area;
                d.y = d.y + (height / 2 - d.y) * damper * area;
            }
            return d.x;
        })
        .attr("cy", function (d) { return d.y; });

    label
        .attr("x", function (d) { return d.x + 30; })
        .attr("y", function (d) { return d.y - 13; });
}

// ---------------------------------------------------------------------------------------

function limit_node_num(obj, nodeL) {
    //��ü.node���� size ũ�� ���� ������������ �����Ѵ�.
    obj.nodes.sort(function (node1, node2) {
        return node2.size - node1.size;
    });

    //ũ���� ������ ��, ���ϴ� ��� ������ŭ �ִ��� Ȯ��
    if (obj.nodes.length <= nodeL) { return obj; }

    //���� ������� �߶� ����
    var nodes = new Array();
    var nodeNs = new Array();
    for (i = 0; i < nodeL; i++) {
        nodes.push(obj.nodes[i]);
        nodeNs.push(obj.nodes[i].id);
    }
    var links = new Array();
    //�ش� ��忡 ����Ǵ� link���� ���ܼ� �׸���.
    obj.links.forEach(function (link) {
        if ((nodeNs.indexOf(link.source) != -1) && (nodeNs.indexOf(link.target) != -1)) {
            links.push(link);
        }
    });

    var newobj = new Object();
    newobj.nodes = nodes;
    newobj.links = links;

    return newobj;
}

function limit_link_num(obj, linkL) {
    //A->B, B->A �� ��ũ�� ��� �����ϹǷ�, �� link�� weight�� ���ؼ� A->B�� �ϳ��� link�� ����
    //�̶�, �� link�� ���Ͽ� ��� �ٸ� link�鿡 ���� linear search�� �ʿ��ؼ� ó���ð��� N^2��ŭ ��
    //�׷��� Node ���� �ִ� 15���� �ſ� ����, �ش� Node ���� link���� max���� 450������ �ӵ��� ũ�� ���ϵ��� �����Ƿ� �� ����� ���
    //���� link ������ �̰ͺ��� ������ ���, source id ���� link�� �з��ؼ� Ž��Ƚ���� ���� �� �ִ� ����� ���

    obj.links.forEach(function (link) {
        var S = link.source;
        var T = link.target;
        for (i = 0; i < obj.links.length; i++) {
            if ((S == obj.links[i].target) && (T == obj.links[i].source)) {
                link.size = link.size + obj.links[i].size;
                obj.links.splice(i, 1);
                break;
            }
        }
    });

    //��忡 ����� link ������ �����ϴ� �迭
    //�� �迭�� i��° ���ҿ� ����� ���ڴ�, i��� id�� ���� ��忡 ����Ǵ� link�� ���� �ǹ��Ѵ�.
    var NodesLink = new Array();
    for (var i = 0; i < nodeIDmax; i++) {
        NodesLink[i] = 0;
    }

    //��� link�� ũ������� ������������ ����
    obj.links.sort(function (l1, l2) {
        return l2.size - l1.size;
    });

    //��� ������ link�� ������ NodesLink�� �ش� source�� target ���ҿ� ���ڸ� ���ϰ�,
    //�̹� linkL��ŭ source�� target�� �������� ��� �Ұ����� link�� ������ obj���� �����Ѵ�.
    for (var i = 0; i < obj.links.length; i++) {
        var link = obj.links[i];
        var S = link.source;
        var T = link.target;

        //��°��� ������ �Ǹ� link���� ������Ŵ
        if ((NodesLink[S] != linkL) && (NodesLink[T] != linkL)) {
            NodesLink[S] = NodesLink[S] + 1;
            NodesLink[T] = NodesLink[T] + 1;
        }
            //�ƴϸ� obj.links ���� ������Ŵ
        else {
            obj.links.splice(i, 1);
            i--;
        }
    }

    //���� weight �������� ��ü ���� ���� ���Ѹ�ŭ�� �����.
    for (var i = 0; i < obj.links.length; i++) {
        if (i < whole_linkNLimit) {
            continue;
        }
        else {
            obj.links.splice(i, 1);
            i--;
        }
    }
    return obj;
}

function singleOutPermission(obj, checked) {
    var num = 1;
    if (checked) {
        var nodes = new Array();
        var nodeIds = new Array();

        obj.links.forEach(function (link) {
            // link�� source�� target�� �ش��ϴ� id�� nodeIds�� ����ִ´�.
            nodeIds.push(link.source);
            nodeIds.push(link.target);
        });
        obj.nodes.forEach(function (node) {
            // nodeIds�� �����ϴ� id�� �� node�� id�� ��,
            // nodes�� nodeIds�� �����ϴ� node�θ� �籸���Ѵ�.
            if (nodeIds.indexOf(node.id) != -1) {
                nodes.push(node);
            } else {
                // ++single_vertex_num;
            }
        });
        obj.nodes = nodes;
    }
}

function max_link(obj) {
    var maxW = 0;
    obj.links.forEach(function (link) {
        if (maxW < link.size) {
            maxW = link.size;
        }
    });
    return maxW;
}

function max_node(obj) {
    var maxN = 0;
    obj.nodes.forEach(function (node) {
        if (maxN < node.size) {
            maxN = node.size;
        }
    });
    return maxN;
}

function changeSizeByRate (obj) {
    var rate = nodeMaxSize_shown / max_node(obj);
    obj.nodes.forEach(function (node) {
        node.size = node.size * rate;
    });
}

function changeSizeByGrade (obj) {
    changeSizeByRate(obj);
    obj.nodes.forEach(function (node) {
        if (node.size > nodeMaxSize_shown / 3 * 2) {
            // node.size = nodeMaxSize_shown; // ���� ����
            node.size = (nodeMaxSize_shown / 3 * 2);
        } else if ((nodeMaxSize_shown / 3 * 2) >= node.size && node.size > (nodeMaxSize_shown / 3)) {
            node.size = (nodeMaxSize_shown / 3 * 2);
        } else {
            node.size = (nodeMaxSize_shown / 3);
        }
    });
}
