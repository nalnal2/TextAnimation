// socket io setting
var socket = io.connect(); // 'http://164.125.34.72:3000'

// graph info. variables
var vertex_n, edge_n;

// slider variables
var head, tail, unit, numOfLine;

// default variables
var default_nodeNLimit = 20,
    default_linkNLimit = 9,
    default_whole_linkNLimit = 10,
    default_singleOutChecked = true,
    default_ttsChecked = true;

// max node(or label) size & max node num
var nodeMaxSize_shown = 15,
    labelMaxSize_shown = 15,
    nodeIDmax = 100,
    single_vertex_num = 0;

// size of force layout
var width = 660, // 960 // 1960
    height = 650; // 580 // 1080

// force setting
var gravity = -600;
// varified link-distance 사용 - testing시 가독성을 위해 node와 label size, line-stroke 임의 변경함
var linkD = 100;
var zoomScale = [0.5, 10];

// user setting data
var nodeNLimit = default_nodeNLimit,
    linkNLimit = default_linkNLimit,
    whole_linkNLimit = default_whole_linkNLimit,
    singleOutChecked = default_singleOutChecked,
    ttsChecked = default_ttsChecked;

var timer,
    repeatModule,
    userfile;

socket.on("animation prepared", function (data) {
    /*
    // declare received datas
    var python_mode = data[0],
        python_exeTime = data[1];
    jsonFile = data[2] + python_exeTime + ".json"; // 전역 변수, 디폴트값 필요
    // handle python preprocessed json file
    if (python_mode == 0) {
        pre_animation(python_exeTime);
    } else if (python_mode == 1) {
        redrawGraph();
        // 2초 후 next graph 그리기 요청
        repeatModule = setTimeout(function () {
            console.log("animation prepared with " + python_exeTime + " times python prog. execution");
            showAnimation2();
        }, 500);
    }
    */
    console.log("animation prepared");
    var times = 10; // data를 이용하는 것으로 수정 필요, python 출력 필요
    var i = head;
    console.log("tail-unit: " + (tail-unit));
    function myLoop() {
        setTimeout(function () {
            redrawGraph_ani(i);
            i += 10;
            if (i <= tail-unit) {
                myLoop();
            }
        }, 3000);
    }
    myLoop();
});

socket.on("quit animation", function (data) {
    console.log("quit animation with " + --data + " times python prog. execution");
});

socket.on("quit animation1", function (data) {
    console.log("quit animation1 with " + --data + " times python prog. execution");
});

// for drawing static-graph (default view of result-page)
$(window).load(function () {
    // static-graph 요청 & 응답 listening
    socket.emit("request static-graph manually"); console.log("request static-graph");
    socket.on("static-graph prepared", function (data) {
        userfile = data;
        console.log("start static-graph");
        showGraph();
        showInfo();
        setRangeUnit();
        setTimeout(function () {
            showGraphInfo();
        }, 100);
    });
});

// simple code for tts
// function tts(text) {
//     document.getElementById("btn-stop").onclick = function () {
//         console.log("stop tts and animation!");
//         stopTimer();
//         speechSynthesis.cancel(msg);
//     };
//
//     var msg = new SpeechSynthesisUtterance();
//     var voices = window.speechSynthesis.getVoices();
//     msg.voice = voices[10]; // Note: some voices don't support altering params
//     msg.voiceURI = "native";
//     msg.volume = 1; // 0 to 1
//     msg.rate = 1.5; // 0.1 to 10
//     msg.pitch = 1.5; //0 to 2
//     msg.text = text;
//     msg.lang = "ko-KR"; //ko-KR
//
//     msg.onerror = function (event) {
//         console.log("An error has occurred with the speech synthesis: " + event.error);
//     };
//     msg.onend = function(event) {
//         console.log("Finished in " + event.elapsedTime + " seconds.");
//     };
//     speechSynthesis.speak(msg);
// }

// send server request for animation
function showAnimation2 () {
    console.log("request animation par.: " + [head, tail, unit]);
    socket.emit("request animation", [head, tail, unit]); console.log("request animation");
}

// function stopAnimation () {
//     socket.emit("stop animation"); console.log("stop animation");
//     clearInterval(repeatModule);
// }

// function pre_animation (num) {
//     setTimeout(function () {
//         redrawGraph();
//         console.log("animation prepared with " + num + "-preprocessed-graph");
//         ++num;
//         if (num < 6) pre_animation(num);
//         else {
//             console.log("quit preprocessed-graph animation");
//             // socket.emit("request animation"); // send signal to start python_mode 1
//             showAnimation2();
//         }
//     }, 2000);
// }

function redrawGraph() {
    setData();
    d3.selectAll("svg").remove();
    showGraph();
    document.getElementById("nonsingle-vertex-num").value = vertex_n;
    setTimeout(function () {
        showGraphInfo();
    }, 100);
}

function redrawGraph_ani(graph_num) {
    setData();
    d3.selectAll("svg").remove();
    showAni(graph_num);
    document.getElementById("nonsingle-vertex-num").value = vertex_n;
    setTimeout(function () {
        showGraphInfo();
    }, 100);
}

function redrawGraph_specific() {
    var jsonpath = document.getElementById("jsonpath").value;
    setData();
    d3.selectAll("svg").remove();
    showGraph_specific(jsonpath);
    document.getElementById("nonsingle-vertex-num").value = vertex_n;
    setTimeout(function () {
        showGraphInfo();
    }, 100);
}

// function showAnimation() {
//     socket.emit("request animation1"); console.log("request animation1");
//     setData();
//     d3.selectAll("svg").remove();
//     showGraph2();
// }

function showGraph_specific(jsonpath) {
    // 그래프에 운동성 부여를 위한 변수 설정
    var force = d3.layout.force()
        .charge(gravity)
        .linkDistance(linkD)
        .size([width, height]);
        // .linkDistance(function (d) { return d.size / 1.5; })

    // zoom 기능 추가를 위한 변수 설정
    var zoom = d3.behavior.zoom()
        .scaleExtent(zoomScale)
        .on("zoom", function () {
            g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });

    // svg 추가
    var svg = d3.select("graph").append("svg")
        .attr("id", "graph-svg")
        .attr("class", "canvas")
        .attr("width", "100%") // 수정함
        .attr("height", height)
        .call(zoom);

    // 그래프를 그릴 컨테이너 추가
    var g = svg.append("g");

    // call json file
    // graph = {nodes: Array(), links: Array()} 즉, graph는 객체
    d3.json(jsonpath, function (error, graph) {
        if (error) throw error;

        var drawingMethod = document.getElementsByName("drawMode");

        if (drawingMethod[1].checked) { // mst mode
            graph = limit_node_num(graph, nodeIDmax / 2);
            TreeMaking(graph);
        } else { // graph mode
            single_vertex_num = 0;
            // 노드 개수 제한
            graph = limit_node_num(graph, nodeNLimit);
            // 노드 별 링크 개수 제한
            graph = limit_link_num(graph, linkNLimit);
            // 해당 노드들 중에서 single out(연결된 링크 개수가 0인 것)을 처리한다.
            singleOutPermission(graph, singleOutChecked);
        }
        // 노드 크기를 big, medium, small로 나누고 이에 따라 실제 그려지는 크기 부여
        changeSizeByGrade(graph);

        vertex_n = graph.nodes.length;
        edge_n = graph.links.length;

        // 그래프의 source와 target을 node의 id를 받아와서 그릴 수 있도록 작성
        var nodeById = d3.map();
        graph.nodes.forEach(function (node) {
            nodeById.set(node.id, node);
        });
        graph.links.forEach(function (link) {
            link.source = nodeById.get(link.source);
            link.target = nodeById.get(link.target);
        });

        var nodes = force.nodes(),
            links = force.links(),
            node = g.selectAll(".node"),
            link = g.selectAll(".link"),
            label = g.selectAll(".label");

        // 각 노드와 링크에 운동성 부여
        force
            .nodes(graph.nodes)
            .links(graph.links)
            .on("tick", tick);

        restart();

        // link, node, lable에 스타일 부여
        function restart() {
            link = link.data(graph.links);
            link.enter()
                .append("line")
                .attr("class", "link")
                .attr("stroke", "#898889")
                .style("stroke-width", 1.5) // 임의 변경
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            link.exit()
                .remove();

            node = node.data(graph.nodes);
            node.enter()
                .append("circle")
                .attr("class", "node")
                .attr("stroke", function (d) {
                    if (d.size == nodeMaxSize_shown) {
                        return "#00008B";
                    } else if (d.size == nodeMaxSize_shown / 3 * 2) {
                        return "#27408B";
                    } else {
                        return "#6897BB";
                    }
                })
                .attr("fill", "#FFFFFF")
                .attr("stroke-width", 3)
                .attr("r", function (d) { return d.size; })
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            node.exit()
                .remove();

            label = label.data(graph.nodes);
            label.enter()
                .append("text")
                .attr("class", "label")
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
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            label.exit()
                .remove();

            force.start();
        }

        // link, node, lable을 화면 상에 위치시키기
        function tick() {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });
            node.attr("cx", function (d) {
                // 가장 큰 노드를 화면 중앙에 오도록 일정 범위 안으로 이동범위 고정
                if (d.index == 0) {
                    damper = 1.5; // 탄성으로 돌아오는 속도의 감쇄정도 (클수록 빨리 돌아옴)
                    area = 0.01; // 벗어날 수 있는 범위 및 마우스와의 일치도 (작을수록 일치도 높음, 거리 김)
                    d.x = d.x + (width / 2 - d.x) * damper * area;
                    d.y = d.y + (height / 2 - d.y) * damper * area;
                }
                return d.x;
            })
                .attr("cy", function (d) { return d.y; });
            label.attr("x", function (d) { return d.x + 30; })
                .attr("y", function (d) { return d.y - 13; });
        }
    });
}

function showGraph() {
    // 그래프에 운동성 부여를 위한 변수 설정
    var force = d3.layout.force()
        .charge(gravity)
        .linkDistance(linkD)
        .size([width, height]);
        // .linkDistance(function (d) { return d.size / 1.5; })

    // zoom 기능 추가를 위한 변수 설정
    var zoom = d3.behavior.zoom()
        .scaleExtent(zoomScale)
        .on("zoom", function () {
            g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });

    // svg 추가
    var svg = d3.select("graph").append("svg")
        .attr("id", "graph-svg")
        .attr("class", "canvas")
        .attr("width", "100%") // 수정함
        .attr("height", height)
        .call(zoom);

    // 그래프를 그릴 컨테이너 추가
    var g = svg.append("g");

    // call json file
    // graph = {nodes: Array(), links: Array()} 즉, graph는 객체
    d3.json("/graph/" + userfile + "/" + userfile + "_graph.js", function (error, graph) {
        if (error) throw error;

        var drawingMethod = document.getElementsByName("drawMode");

        if (drawingMethod[1].checked) { // mst mode
            graph = limit_node_num(graph, nodeIDmax / 2);
            TreeMaking(graph);
        } else { // graph mode
            single_vertex_num = 0;
            // 노드 개수 제한
            graph = limit_node_num(graph, nodeNLimit);
            // 노드 별 링크 개수 제한
            graph = limit_link_num(graph, linkNLimit);
            // 해당 노드들 중에서 single out(연결된 링크 개수가 0인 것)을 처리한다.
            singleOutPermission(graph, singleOutChecked);
        }
        // 노드 크기를 big, medium, small로 나누고 이에 따라 실제 그려지는 크기 부여
        changeSizeByGrade(graph);

        vertex_n = graph.nodes.length;
        edge_n = graph.links.length;

        // 그래프의 source와 target을 node의 id를 받아와서 그릴 수 있도록 작성
        var nodeById = d3.map();
        graph.nodes.forEach(function (node) {
            nodeById.set(node.id, node);
        });
        graph.links.forEach(function (link) {
            link.source = nodeById.get(link.source);
            link.target = nodeById.get(link.target);
        });

        var nodes = force.nodes(),
            links = force.links(),
            node = g.selectAll(".node"),
            link = g.selectAll(".link"),
            label = g.selectAll(".label");

        // 각 노드와 링크에 운동성 부여
        force
            .nodes(graph.nodes)
            .links(graph.links)
            .on("tick", tick);

        restart();

        // link, node, lable에 스타일 부여
        function restart() {
            link = link.data(graph.links);
            link.enter()
                .append("line")
                .attr("class", "link")
                .attr("stroke", "#898889")
                .style("stroke-width", 1.5) // 임의 변경
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            link.exit()
                .remove();

            node = node.data(graph.nodes);
            node.enter()
                .append("circle")
                .attr("class", "node")
                .attr("stroke", function (d) {
                    if (d.size == nodeMaxSize_shown) {
                        return "#00008B";
                    } else if (d.size == nodeMaxSize_shown / 3 * 2) {
                        return "#27408B";
                    } else {
                        return "#6897BB";
                    }
                })
                .attr("fill", "#FFFFFF")
                .attr("stroke-width", 3)
                .attr("r", function (d) { return d.size; })
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            node.exit()
                .remove();

            label = label.data(graph.nodes);
            label.enter()
                .append("text")
                .attr("class", "label")
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
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            label.exit()
                .remove();

            force.start();
        }

        // link, node, lable을 화면 상에 위치시키기
        function tick() {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });
            node.attr("cx", function (d) {
                // 가장 큰 노드를 화면 중앙에 오도록 일정 범위 안으로 이동범위 고정
                if (d.index == 0) {
                    damper = 1.5; // 탄성으로 돌아오는 속도의 감쇄정도 (클수록 빨리 돌아옴)
                    area = 0.01; // 벗어날 수 있는 범위 및 마우스와의 일치도 (작을수록 일치도 높음, 거리 김)
                    d.x = d.x + (width / 2 - d.x) * damper * area;
                    d.y = d.y + (height / 2 - d.y) * damper * area;
                }
                return d.x;
            })
                .attr("cy", function (d) { return d.y; });
            label.attr("x", function (d) { return d.x + 30; })
                .attr("y", function (d) { return d.y - 13; });
        }
    });
}

function showAni(graph_num) {
    // 그래프에 운동성 부여를 위한 변수 설정
    var force = d3.layout.force()
        .charge(gravity)
        .linkDistance(linkD)
        .size([width, height]);
        // .linkDistance(function (d) { return d.size / 1.5; })

    // zoom 기능 추가를 위한 변수 설정
    var zoom = d3.behavior.zoom()
        .scaleExtent(zoomScale)
        .on("zoom", function () {
            g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });

    // svg 추가
    var svg = d3.select("graph").append("svg")
        .attr("id", "graph-svg")
        .attr("class", "canvas")
        .attr("width", "100%") // 수정함
        .attr("height", height)
        .call(zoom);

    // 그래프를 그릴 컨테이너 추가
    var g = svg.append("g");

    // call json file
    // graph = {nodes: Array(), links: Array()} 즉, graph는 객체
    console.log(userfile + "_graph_" + graph_num + ".js");
    d3.json("/graph/" + userfile + "/" + userfile + "_graph_" + graph_num + ".js", function (error, graph) {
        if (error) throw error;

        var drawingMethod = document.getElementsByName("drawMode");

        if (drawingMethod[1].checked) { // mst mode
            graph = limit_node_num(graph, nodeIDmax / 2);
            TreeMaking(graph);
        } else { // graph mode
            single_vertex_num = 0;
            // 노드 개수 제한
            graph = limit_node_num(graph, nodeNLimit);
            // 노드 별 링크 개수 제한
            graph = limit_link_num(graph, linkNLimit);
            // 해당 노드들 중에서 single out(연결된 링크 개수가 0인 것)을 처리한다.
            singleOutPermission(graph, singleOutChecked);
        }
        // 노드 크기를 big, medium, small로 나누고 이에 따라 실제 그려지는 크기 부여
        changeSizeByGrade(graph);

        vertex_n = graph.nodes.length;
        edge_n = graph.links.length;

        console.log("[vertex_n, edge_n]=" + [vertex_n, edge_n]);

        // 그래프의 source와 target을 node의 id를 받아와서 그릴 수 있도록 작성
        var nodeById = d3.map();
        graph.nodes.forEach(function (node) {
            nodeById.set(node.id, node);
        });
        graph.links.forEach(function (link) {
            link.source = nodeById.get(link.source);
            link.target = nodeById.get(link.target);
        });

        var nodes = force.nodes(),
            links = force.links(),
            node = g.selectAll(".node"),
            link = g.selectAll(".link"),
            label = g.selectAll(".label");

        // 각 노드와 링크에 운동성 부여
        force
            .nodes(graph.nodes)
            .links(graph.links)
            .on("tick", tick);

        restart();

        // link, node, lable에 스타일 부여
        function restart() {
            link = link.data(graph.links);
            link.enter()
                .append("line")
                .attr("class", "link")
                .attr("stroke", "#898889")
                .style("stroke-width", 1.5) // 임의 변경
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            link.exit()
                .remove();

            node = node.data(graph.nodes);
            node.enter()
                .append("circle")
                .attr("class", "node")
                .attr("stroke", function (d) {
                    if (d.size == nodeMaxSize_shown) {
                        return "#00008B";
                    } else if (d.size == nodeMaxSize_shown / 3 * 2) {
                        return "#27408B";
                    } else {
                        return "#6897BB";
                    }
                })
                .attr("fill", "#FFFFFF")
                .attr("stroke-width", 3)
                .attr("r", function (d) { return d.size; })
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            node.exit()
                .remove();

            label = label.data(graph.nodes);
            label.enter()
                .append("text")
                .attr("class", "label")
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
                .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
            label.exit()
                .remove();

            force.start();
        }

        // link, node, lable을 화면 상에 위치시키기
        function tick() {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });
            node.attr("cx", function (d) {
                // 가장 큰 노드를 화면 중앙에 오도록 일정 범위 안으로 이동범위 고정
                if (d.index == 0) {
                    damper = 1.5; // 탄성으로 돌아오는 속도의 감쇄정도 (클수록 빨리 돌아옴)
                    area = 0.01; // 벗어날 수 있는 범위 및 마우스와의 일치도 (작을수록 일치도 높음, 거리 김)
                    d.x = d.x + (width / 2 - d.x) * damper * area;
                    d.y = d.y + (height / 2 - d.y) * damper * area;
                }
                return d.x;
            })
                .attr("cy", function (d) { return d.y; });
            label.attr("x", function (d) { return d.x + 30; })
                .attr("y", function (d) { return d.y - 13; });
        }
    });
}

// function showGraph2() {
//     // location.href='http://164.125.34.72:3000/animate';
//     // socket.emit("request animation1"); console.log("request animation1");
//
//     // tts load
//     if (ttsChecked) {
//         var tts_text = '제휴 받아서 시술받았는데, 와, 보통 손님과 다를 바 없는 서비스였습니다! 염색을 했는데 고급약 써서 원래 12만원이라는 것이 5만원에..! 커트랑 스타일링도 포함이라 두 배, 열 배, 백 배 더 감동받았습니다. 색도 추천받았는데 원하는 두 색깔 섞어서 결과적으로 개이뻐졌다는 사실!';
//         tts(tts_text);
//     }
//     // 그래프에 운동성 부여를 위한 변수 설정
//     var force = d3.layout.force()
//         .charge(gravity)
//         .linkDistance(linkD)
//         .size([width, height]);
//         // .linkDistance(function (d) { return d.size / 1.5; })
//
//     // zoom 기능 추가를 위한 변수 설정
//     var zoom = d3.behavior.zoom()
//         .scaleExtent(zoomScale)
//         .on("zoom", function () {
//             g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
//         });
//
//     // svg 추가
//     var svg = d3.select("graph").append("svg")
//         .attr("id", "graph-svg")
//         .attr("class", "canvas")
//         .attr("width", "100%")
//         .attr("height", height)
//         .call(zoom);
//
//     // 그래프를 그릴 컨테이너 추가
//     var g = svg.append("g");
//
//     // call json file
//     // graph = {nodes: Array(), links: Array()} 즉, graph는 객체
//     d3.json(jsonPath, function (error, graph) {
//         if (error) throw error;
//
//         // 노드 개수 제한
//         graph = limit_node_num(graph, nodeNLimit);
//         // 노드 별 링크 개수 제한
//         graph = limit_link_num(graph, linkNLimit);
//         // 해당 노드들 중에서 single out(연결된 링크 개수가 0인 것)을 처리한다.
//         singleOutPermission(graph, singleOutChecked);
//         // 노드 크기를 big, medium, small로 나누고 이에 따라 실제 그려지는 크기 부여
//         changeSizeByGrade(graph);
//
//         // 그래프의 source와 target을 node의 id를 받아와서 그릴 수 있도록 작성
//         var nodeById = d3.map();
//         graph.nodes.forEach(function (node) {
//             nodeById.set(node.id, node);
//         });
//         graph.links.forEach(function (link) {
//             link.source = nodeById.get(link.source);
//             link.target = nodeById.get(link.target);
//         });
//
//         var nodes = force.nodes(),
//             links = force.links(),
//             node = g.selectAll(".node"),
//             link = g.selectAll(".link"),
//             label = g.selectAll(".label");
//
//         // 각 노드와 링크에 운동성 부여
//         force
//             .nodes(graph.nodes)
//             .links(graph.links)
//             .on("tick", tick);
//
//         // restart(link, node, label, graph, force);
//         restart();
//
//         // test for basic dynamic animation - success!
//         /*
//         timer = setInterval(function () {
//             // restart();
//             var num = 2;
//             var jsonPath_new = jsonDir + "ed_graph" + num + ".json";
//             console.log(jsonPath_new);
//             d3.json(jsonPath, function (error, graph) {
//                 if (error) throw error;
//                 console.log(graph);
//             });
//         }, 2000);
//         */
//
//         socket.on("animation1 prepared", function (data) {
//             setTimeout(function () {
//                 console.log("animation1 prepared with " + data + " times python prog. execution");
//                 // graph 재구성
//                 // ...
//                 restart();
//                 if (data < 6) {
//                     socket.emit("request animation1");
//                 }
//             }, 200);
//         });
//
//         // link, node, lable에 스타일 부여
//         function restart() {
//             link = link.data(graph.links);
//             link.enter()
//                 .append("line")
//                 .attr("class", "link")
//                 .attr("stroke", "#898889")
//                 .style("stroke-width", 1.5) // 임의 변경
//                 .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
//             link.exit()
//                 .remove();
//
//             node = node.data(graph.nodes);
//             node.enter()
//                 .append("circle")
//                 .attr("class", "node")
//                 .attr("stroke", function (d) {
//                     if (d.size == nodeMaxSize_shown) {
//                         return "#00008B";
//                     } else if (d.size == nodeMaxSize_shown / 3 * 2) {
//                         return "#27408B";
//                     } else {
//                         return "#6897BB";
//                     }
//                 })
//                 .attr("fill", "#FFFFFF")
//                 .attr("stroke-width", 3)
//                 .attr("r", function (d) { return d.size; })
//                 .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
//             node.exit()
//                 .remove();
//
//             label = label.data(graph.nodes);
//             label.enter()
//                 .append("text")
//                 .attr("class", "label")
//                 .attr("text-anchor", "middle")
//                 .style("fill", function (d) {
//                     if (d.size == nodeMaxSize_shown) {
//                         return "#000000";
//                     } else if (d.size == nodeMaxSize_shown / 3 * 2) {
//                         return "#0D0D0D";
//                     } else {
//                         return "#262626";
//                     }
//                 })
//                 .style("font-family", "Verdana")
//                 .style("font-size", function (d) { return labelMaxSize_shown + "px"; })
//                 .text(function (d) { return d.label; })
//                 .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
//             label.exit()
//                 .remove();
//
//             force.start();
//         }
//
//         // link, node, lable을 화면 상에 위치시키기
//         function tick() {
//             link.attr("x1", function (d) { return d.source.x; })
//                 .attr("y1", function (d) { return d.source.y; })
//                 .attr("x2", function (d) { return d.target.x; })
//                 .attr("y2", function (d) { return d.target.y; });
//             node.attr("cx", function (d) {
//                 // 가장 큰 노드를 화면 중앙에 오도록 일정 범위 안으로 이동범위 고정
//                 if (d.index == 0) {
//                     damper = 1.5; // 탄성으로 돌아오는 속도의 감쇄정도 (클수록 빨리 돌아옴)
//                     area = 0.01; // 벗어날 수 있는 범위 및 마우스와의 일치도 (작을수록 일치도 높음, 거리 김)
//                     d.x = d.x + (width / 2 - d.x) * damper * area;
//                     d.y = d.y + (height / 2 - d.y) * damper * area;
//                 }
//                 return d.x;
//             })
//                 .attr("cy", function (d) { return d.y; });
//             label.attr("x", function (d) { return d.x + 30; })
//                 .attr("y", function (d) { return d.y - 13; });
//         }
//     });
// }

var stopTimer = function() {
    clearInterval(timer);
};

// function TreeMaking(obj) {
//     obj.links.length = 0;
// }

function restart(link, node, label, graph, force) {
    link = link.data(graph.links);
    link.enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", "#898889")
        .style("stroke-width", 1.5) // 임의 변경
        .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
    link.exit()
        .remove();

    node = node.data(graph.nodes);
    node.enter()
        .append("circle")
        .attr("class", "node")
        .attr("stroke", function (d) {
            if (d.size == nodeMaxSize_shown) {
                return "#00008B";
            } else if (d.size == nodeMaxSize_shown / 3 * 2) {
                return "#27408B";
            } else {
                return "#6897BB";
            }
        })
        .attr("fill", "#FFFFFF")
        .attr("stroke-width", 3)
        .attr("r", function (d) { return d.size; })
        .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
    node.exit()
        .remove();

    label = label.data(graph.nodes);
    label.enter()
        .append("text")
        .attr("class", "label")
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
        .call(force.drag().on("dragstart", function () { d3.event.sourceEvent.stopPropagation(); }));
    label.exit()
        .remove();

    force.start();
}

function setData() {
    // Control Option에 입력한 사용자 옵션을 반영
    var target1 = document.getElementById("nodeNrange");
    nodeNLimit = target1.options[target1.selectedIndex].value; // --> json파일의 각 node의 size를 달리한 후 주석 제거하기
    // nodeNLimit = 400; // 윗줄 주석 참고, 밑의 whole_linkNLimit 도 변경해야!
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
    ttsChecked = document.getElementsByName("tts")[0].checked;
    setRangeUnit();
}

function limit_node_num(obj, nodeL) {
    //객체.node에서 size 크기 기준 내림차순으로 정렬한다.
    obj.nodes.sort(function (node1, node2) {
        return node2.size - node1.size;
    });

    //크기대로 정렬한 후, 원하는 노드 개수만큼 있는지 확인
    if (obj.nodes.length <= nodeL) { return obj; }

    //제한 개수대로 잘라낸 다음
    var nodes = new Array();
    var nodeNs = new Array();
    for (i = 0; i < nodeL; i++) {
        nodes.push(obj.nodes[i]);
        nodeNs.push(obj.nodes[i].id);
    }
    var links = new Array();
    //해당 노드에 연결되는 link만을 남겨서 그린다.
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
    //A->B, B->A 인 링크가 모두 존재하므로, 두 link의 weight를 합해서 A->B인 하나의 link로 만듦
    //이때, 각 link에 대하여 모든 다른 link들에 대해 linear search가 필요해서 처리시간이 N^2만큼 듦
    //그러나 Node 수가 최대 15개로 매우 적고, 해당 Node 간의 link개수 max값이 450정도로 속도가 크게 저하되지 않으므로 이 방법을 사용
    //만약 link 개수가 이것보다 증가할 경우, source id 별로 link를 분류해서 탐색횟수를 줄일 수 있는 방법을 사용

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

    //노드에 연결될 link 개수를 저장하는 배열
    //이 배열의 i번째 원소에 저장된 숫자는, i라는 id를 가진 노드에 연결되는 link의 수를 의미한다.
    var NodesLink = new Array();
    for (var i = 0; i < nodeIDmax; i++) {
        NodesLink[i] = 0;
    }

    //모든 link를 크기순으로 내림차순으로 정렬
    obj.links.sort(function (l1, l2) {
        return l2.size - l1.size;
    });

    //출력 가능한 link가 나오면 NodesLink에 해당 source와 target 원소에 숫자를 더하고,
    //이미 linkL만큼 source와 target이 가득차서 출력 불가능한 link가 나오면 obj에서 삭제한다.
    for (var i = 0; i < obj.links.length; i++) {
        var link = obj.links[i];
        var S = link.source;
        var T = link.target;

        //출력가능 조건이 되면 link수만 증가시킴
        if ((NodesLink[S] != linkL) && (NodesLink[T] != linkL)) {
            NodesLink[S] = NodesLink[S] + 1;
            NodesLink[T] = NodesLink[T] + 1;
        }
            //아니면 obj.links 에서 삭제시킴
        else {
            obj.links.splice(i, 1);
            i--;
        }
    }

    //상위 weight 기준으로 전체 에지 개수 제한만큼만 남긴다.
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

//해당 노드들 중에서 single out(연결된 링크 갯수가 0)을 처리한다.
function singleOutPermission(obj, checked) {
    var num = 1;
    if (checked) {
        var nodes = new Array();
        var nodeIds = new Array();

        obj.links.forEach(function (link) {
            // link의 source와 target에 해당하는 id를 nodeIds에 집어넣는다.
            nodeIds.push(link.source);
            nodeIds.push(link.target);
        });
        obj.nodes.forEach(function (node) {
            // nodeIds에 존재하는 id와 각 node의 id를 비교,
            // nodes를 nodeIds에 존재하는 node로만 재구성한다.
            if (nodeIds.indexOf(node.id) != -1) {
                nodes.push(node);
            } else {
                ++single_vertex_num;
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

function changeSizeByRate(obj) {
    var rate = nodeMaxSize_shown / max_node(obj);
    obj.nodes.forEach(function (node) {
        node.size = node.size * rate;
    });
}

function changeSizeByGrade(obj) {
    changeSizeByRate(obj);
    obj.nodes.forEach(function (node) {
        if (node.size > nodeMaxSize_shown / 3 * 2) {
            // node.size = nodeMaxSize_shown; // 임의 변경
            node.size = (nodeMaxSize_shown / 3 * 2);
        } else if ((nodeMaxSize_shown / 3 * 2) >= node.size && node.size > (nodeMaxSize_shown / 3)) {
            node.size = (nodeMaxSize_shown / 3 * 2);
        } else {
            node.size = (nodeMaxSize_shown / 3);
        }
    });
}

function setRangeUnit() {
    // dynamic-graph mode
    var target = document.getElementById("sRange-unit");
    unit = target.options[target.selectedIndex].value;
}

function setSRange() {
    head = document.getElementById("amount1").value;
    tail = document.getElementById("amount2").value;
    $("#slider-range").slider("values", 0, head);
    $("#slider-range").slider("values", 1, tail);
}

// meta file 읽고 파일 정보, 그래프 정보 표시
function showInfo() {
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
                    // sRange 초기화 시작
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
                    info_data = temp[1];
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
                    info_data = temp[1];
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

function showGraphInfo() {
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

function showSRange(numOfLine) {
    var v1 = Math.floor(numOfLine / 3);
    var v2 = Math.floor(numOfLine / 3 * 2);

    // head, tail 초기화
    head = v1;
    tail = v2;

    // slider-range 초기화
    $("#slider-range").slider({
        range: true,
        min: 1,
        max: numOfLine,
        values: [v1, v2],
        slide: function (event, ui) {
            head = ui.values[0], tail = ui.values[1];
            $("#amount1").val(head);
            $("#amount2").val(tail);
        }
    });
    $("#amount1").val($("#slider-range").slider("values", 0));
    $("#amount2").val($("#slider-range").slider("values", 1));

    // slider head & tail 표시
    document.getElementById("sRange-head").innerHTML = 1;
    document.getElementById("sRange-tail").innerHTML = numOfLine;
}

function sleep(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay) ;
}
