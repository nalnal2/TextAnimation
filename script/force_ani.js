const CREATED = 1;
const NORMAL = 0;
const DISAPPEARED = -1;

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
var graph_num = 1;

var default_nodeNLimit = 20,
    default_linkNLimit = 9,
    default_whole_linkNLimit = 10,
    default_singleOutChecked = true;

var nodeMaxSize_shown = 15,
    labelMaxSize_shown = 15,
    nodeIDmax = 100;

var width = 960,
    height = 500;

var svg = d3.select("graph").append("svg")
    .attr("id", "graph-svg")
    .attr("class", "canvas")
    .attr("width", "100%")
    .attr("height", height);

var simulation = d3.forceSimulation();
var link_force;

simulation
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .alphaTarget(1);

var g = svg.append("g")
        .attr("class", "everything");

var link = g.append("g")
        .attr("class", "links")
        .selectAll("line");

var node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle");

var label = g.append("g")
        .attr("class", "labels")
        .selectAll("text");

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

function afterLoadJson (error, graphs) {
    if (error) throw error;
    if (graphs.length == 2) {
        graph_cur = graphs[0];
        graph_fut = graphs[1];

        graph_cur = limit_node_num(graph_cur, default_nodeNLimit);
        graph_cur = limit_link_num(graph_cur, default_linkNLimit);
        singleOutPermission(graph_cur, default_singleOutChecked);
        // console.log(JSON.parse(JSON.stringify(graph_cur))); --> 콘솔출력 업데이트 X
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

    graph_num += 10;
    // if (graph_num < 165) { // 274 // future graph도 불러오기 때문에 graph_num + 10 이 마지막 그래프 번호를 넘으면 안된다는 조건으로 바꿔야 함.
    //     ani_loop2();
    // } else {
    //     graph_num = 1; // 초기화
    // }
    if (graph_num >= 165) {
        graph_num = 1;
    }
}

function ani_loop2 () {
    var q = d3.queue();
    // setTimeout (function () {
    //     if (graph_num == 1) {
    //         q.defer(d3.json, "/graph/흥부전/흥부전_graph_" + graph_num + ".js");
    //     }
    //     q.defer(d3.json, "/graph/흥부전/흥부전_graph_" + (graph_num + 10) + ".js"); // load future graph
    //     q.awaitAll(afterLoadJson);
    // }, 3000);
    if (graph_num == 1) {
        q.defer(d3.json, "/graph/흥부전/흥부전_graph_" + graph_num + ".js");
    }
    q.defer(d3.json, "/graph/흥부전/흥부전_graph_" + (graph_num + 10) + ".js"); // load future graph
    q.awaitAll(afterLoadJson);
}

function ani_loop () {
    setTimeout (function () {
        d3.json("/graph/흥부전/흥부전_graph_" + graph_num + ".js", function (err, graph) {
            if (graph_num != 1) {
                graph_prev = graph_cur;
            }
            graph_cur = graph;
            graph_cur = limit_node_num(graph_cur, default_nodeNLimit);
            graph_cur = limit_link_num(graph_cur, default_linkNLimit);
            singleOutPermission(graph_cur, default_singleOutChecked);
            changeSizeByGrade(graph_cur);

            // -------------------------------- for check --------------------------------
            console.log("graph_num: " + graph_num);
            console.log("graph_prev: ");
            console.log(graph_prev);
            console.log("graph_cur: ");
            console.log(graph_cur);
            console.log("\n");

            // ---------------------------------------------------------------------------
            // graph_num == 1 일 때 온전한 그래프를 그리고,
            // graph_num > 1 일 때 graph_prev와 graph_cur 비교 후, graph_prev에 변경된 사항을 적용하여 그래프를 그림

            if (graph_num == 1) { // 첫 그래프는 온전한 그래프를 그림
                graph_toDraw = graph_cur;
                // 그리기
                restart();
                drag_handler(node);
                drag_handler(label);
                zoom_handler(svg);
                simulation
                    .on("tick", tick_action);
            } else { // 두 번째 그래프부터 이전 그래프에 변경된 사항을 적용하여 그림
                graph_toDraw = graph_prev;
                // 변경된 사항 구하기
                // find_nodeToDelete(graph_prev, graph_cur);
                // find_linkToDelete(graph_prev, graph_cur);
                // find_nodeToAdd(graph_prev, graph_cur);
                // find_linkToAdd(graph_prev, graph_cur);
                // 변경된 사항 적용하기

                // 그리기
                // restart();
                // drag_handler(node);
                // drag_handler(label);
            }
            // ---------------------------------------------------------------------------

            graph_num += 10;
            if (graph_num < 12) { // 274
                ani_loop();
            } else {
                graph_num = 1; // 초기화
            }
        });
    }, 3000);
}

// ani_loop2();

// 비교 1 - 새로 생긴 노드, 링크 찾기 (prev V.S. cur)
function find_created (prev, cur) {
    // 초기화
    changes.createdNodes = [];
    changes.createdLinks = [];
    changes.sizeChangedNodes = [];

    // 모든 cur의 노드(링크)에 대해, prev의 노드(링크)에 포함되어있나 없나 검사
    // 포함돼있지 않은 노드(링크) 객체를 저장
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
        } else { // prev -> cur 에서 계속해서 존재하는 녀석
            // (prevNodes_id의 인덱스 순서) == (prev.nodes의 인덱스 순서)
            if (node.size != prev.nodes[index].size) { // 사이즈가 변경된 노드의 id를 기록
                changes.sizeChangedNodes.push({id: node.id, newSize: node.size}); // 나중에 cur.nodes에서 해당 id 노드의 size로 업데이트
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

// 비교 2 - 사라질 노드, 링크 찾기 (cur V.S. fut)
function find_disappeared (cur, fut) {
    // 초기화
    changes.disappearedNodes = [];
    changes.disappearedLinks = [];

    // 모든 cur의 노드(링크)에 대해, fut의 노드(링크)에 포함되어있나 없나 검사
    // 포함돼있지 않은 노드(링크)의 id를 저장
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

function make_graphToDraw () {
    if (graph_num == 1) {
        // graph_toDraw를 graph_cur로 초기화
        graph_toDraw = graph_cur;

        // 노드의 타입 null로 초기화
        graph_toDraw.nodes.forEach(function (node) {
            node.type = NORMAL;
        });
    } else { // graph_prev가 존재하면 / graph_num == 1이면 (두 번째 애니메이션부터)
        // created 구성
        find_created(graph_prev, graph_cur);

        // disappeared를 참고하여 노드/링크 삭제
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

        // 노드의 타입 NORMAL로 초기화
        graph_toDraw.nodes.forEach(function (node) {
            node.type = NORMAL;
        });
        d3.selectAll("circle").style("fill", "#1C1C1C");


        // created를 참고하여 노드/링크 추가 & 노드에 타입(created) 표시
        changes.createdNodes.forEach(function (node) {
            node.type = CREATED;
            graph_toDraw.nodes.push(node);
        });
        changes.createdLinks.forEach(function (link) {
            graph_toDraw.links.push(link);
        });
    }

    // disappeared 구성
    find_disappeared(graph_cur, graph_fut);

    // dissapeared를 참고하여 노드에 타입(disappeared) 표시
    changes.disappearedNodes.forEach(function (nodeID) {
        for (var i = 0; i < graph_toDraw.nodes.length; ++i) {
            if (graph_toDraw.nodes[i].id == nodeID) {
                graph_toDraw.nodes[i].type = DISAPPEARED;
            }
        }
    });

    // size 변경
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

    // 구성한 그래프 그리기
    restart();
    drag_handler(node);
    drag_handler(label);
    if (graph_num == 1) {
        zoom_handler(svg);
        simulation
            .on("tick", tick_action);
    }
    // zoom_handler(svg);
    // simulation
    //     .on("tick", tick_action);

    // created 표시
    changes.createdNodes.forEach(function (node) {
        d3.select($("#"+node.id)[0]).style("fill", "#BDBDBD");
    });
    // disappeared 표시
    changes.disappearedNodes.forEach(function (nodeID) {
        d3.select($("#"+nodeID)[0]).style("fill", "#FFFFFF");
    });
    // size 변경
    changes.sizeChangedNodes.forEach(function (node) {
        d3.select($("#"+node.id)[0]).attr("r", node.newSize);
    });
}

// ---------------------------------------------------------------------------------------

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

    // stroke 노드가 큰 순서대로 - #00008B, #27408B, #6897BB
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
        if (i < default_whole_linkNLimit) {
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
            // node.size = nodeMaxSize_shown; // 임의 변경
            node.size = (nodeMaxSize_shown / 3 * 2);
        } else if ((nodeMaxSize_shown / 3 * 2) >= node.size && node.size > (nodeMaxSize_shown / 3)) {
            node.size = (nodeMaxSize_shown / 3 * 2);
        } else {
            node.size = (nodeMaxSize_shown / 3);
        }
    });
}
