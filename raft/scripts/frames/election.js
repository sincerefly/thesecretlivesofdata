
"use strict";
/*jslint browser: true, nomen: true*/
/*global define*/

define([], function () {
    return function (frame) {
        var player = frame.player(),
            layout = frame.layout(),
            model = function() { return frame.model(); },
            client = function(id) { return frame.model().clients.find(id); },
            node = function(id) { return frame.model().nodes.find(id); },
            cluster = function(value) { model().nodes.toArray().forEach(function(node) { node.cluster(value); }); },
            wait = function() { var self = this; model().controls.show(function() { self.stop(); }); },
            subtitle = function(s, pause) { model().subtitle = s + model().controls.html(); layout.invalidate(); if (pause === undefined) { model().controls.show() }; };

        //------------------------------
        // Title
        //------------------------------
        frame.after(1, function() {
            model().clear();
            layout.invalidate();
        })
        .after(500, function () {
            frame.model().title = '<h2 style="visibility:visible">领导人选举(Leader Election)</h1>'
                                + '<br/>' + frame.model().controls.html();
            layout.invalidate();
        })
        .after(200, wait).indefinite()
        .after(500, function () {
            model().title = "";
            layout.invalidate();
        })

        //------------------------------
        // Initialization
        //------------------------------
        .after(300, function () {
            model().nodes.create("A").init();
            model().nodes.create("B").init();
            model().nodes.create("C").init();
            cluster(["A", "B", "C"]);
        })

        //------------------------------
        // Election Timeout
        //------------------------------
        .after(1, function () {
            model().ensureSingleCandidate();
            model().subtitle = '<h2>在 Raft 中，有两个控制选举的超时设置。</h2>'
                           + model().controls.html();
            layout.invalidate();
        })
        .after(model().electionTimeout / 2, function() { model().controls.show(); })
        .after(100, function () {
            subtitle('<h2>首先是 <span style="color:green">选举超时(election timeout)</span>。</h2>');
        })
        .after(1, function() {
            subtitle('<h2>选举超时是追随者等待成为候选人的时间。</h2>');
        })
        .after(1, function() {
            subtitle('<h2>选举超时时间随机设置在 150 毫秒到 300 毫秒之间。</h2>');
        })
        .after(1, function() {
            subtitle("", false);
        })

        //------------------------------
        // Candidacy
        //------------------------------
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "candidate");
        })
        .after(1, function () {
            subtitle('<h2>选举超时后，追随者成为候选人并开始新的<em>选举任期(election term)</em>...</h2>');
        })
        .after(1, function () {
            subtitle('<h2>...为自己投票...</h2>');
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>...并向其它节点发出 <em>投票请求</em> 消息.</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>如果接收节点在这个任期内还没有投票，那么它会投票给候选人...</h2>');
        })
        .after(1, function () {
            subtitle('<h2>...并且节点重置其选举超时.</h2>');
        })


        //------------------------------
        // Leadership & heartbeat timeout.
        //------------------------------
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            subtitle('<h2>一旦候选人获得多数票，他就会成为领导者。</h2>');
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>领导者开始向其追随者发送<em>附加条目(Append Entries)</em>消息。</h2>');
        })
        .after(1, function () {
            subtitle('<h2>这些消息按照<span style="color:red">心跳超时(heartbeat timeout)</span>指定的时间间隔发送。</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>然后追随者回复每条<em>附加条目(Append Entries)</em>消息。</h2>');
        })
        .after(1, function () {
            subtitle('', false);
        })
        .after(model().heartbeatTimeout * 2, function () {
            subtitle('<h2>这个选举期限将持续到追随者停止接收心跳并成为候选人为止。</h2>', false);
        })
        .after(100, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
        })

        //------------------------------
        // Leader re-election
        //------------------------------
        .after(model().heartbeatTimeout * 2, function () {
            subtitle('<h2>让我们阻止领导者并观看重新选举的发生。</h2>', false);
        })
        .after(100, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
            model().leader().state("stopped")
        })
        .after(model().defaultNetworkLatency, function () {
            model().ensureSingleCandidate()
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            subtitle('<h2>节点 ' + model().leader().id + ' 现在是任期的领导者 ' + model().leader().currentTerm() + '.</h2>', false);
        })
        .after(1, wait).indefinite()

        //------------------------------
        // Split Vote
        //------------------------------
        .after(1, function () {
            subtitle('<h2>要求获得多数票可以保证每届任期只能选出一位领导人。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>如果两个节点同时成为候选人，则可能会发生分裂投票。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>让我们来看一个分裂投票的例子...</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('', false);
            model().nodes.create("D").init().currentTerm(node("A").currentTerm());
            cluster(["A", "B", "C", "D"]);

            // Make sure two nodes become candidates at the same time.
            model().resetToNextTerm();
            var nodes = model().ensureSplitVote();

            // Increase latency to some nodes to ensure obvious split.
            model().latency(nodes[0].id, nodes[2].id, model().defaultNetworkLatency * 1.25);
            model().latency(nodes[1].id, nodes[3].id, model().defaultNetworkLatency * 1.25);
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "candidate");
        })
        .after(model().defaultNetworkLatency * 0.25, function () {
            subtitle('<h2>两个节点都开始同一任期的选举...</h2>');
        })
        .after(model().defaultNetworkLatency * 0.75, function () {
            subtitle('<h2>...并且每个节点都先于另一个节点到达单个追随者节点。</h2>');
        })
        .after(model().defaultNetworkLatency, function () {
            subtitle('<h2>现在每位候选人都有 2 票，并且在本任期内不能再获得更多选票。</h2>');
        })
        .after(1, function () {
            subtitle('<h2>节点将等待新的选举并重试。</h2>', false);
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            model().resetLatencies();
            subtitle('<h2>节点 ' + model().leader().id + ' 在任期内获得多数票 ' + model().leader().currentTerm() + ' 所以成为领导者。</h2>', false);
        })
        .after(1, wait).indefinite()

        .then(function() {
            player.next();
        })


        player.play();
    };
});
