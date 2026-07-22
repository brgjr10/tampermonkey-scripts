// ==UserScript==
// @name         Zima Web Terminal Injector
// @namespace    http://tampermonkey.net/
// @version      1.1
// @match        http://<<ZIMA_HOST>>:7681/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let ttySocket = null;
    let currentLine = "";
    let injecting = false;

const origSend = WebSocket.prototype.send;

WebSocket.prototype.send = function (data) {

    if (this.url.includes("/ws") && this.protocol === "tty") {
        ttySocket = this;
    }

    let packet = null;

    if (typeof data === "string") {
        packet = data;
    } else if (data instanceof ArrayBuffer) {
        packet = new TextDecoder().decode(new Uint8Array(data));
    } else if (ArrayBuffer.isView(data)) {
        packet = new TextDecoder().decode(data);
    }

    console.log({
        raw: data,
        packet,
        type: typeof data,
        arrayBuffer: data instanceof ArrayBuffer,
        view: ArrayBuffer.isView(data)
    });

if (!injecting && packet && packet.startsWith("0")) {

    const key = packet.substring(1);

    switch (key) {

        case "\r": {
            const cmd = currentLine.trim();

            console.log("Command:", cmd);

            if (/^sudo(\s|$)/.test(cmd)) {
                console.log("Detected sudo:", cmd);

                setTimeout(() => {
                    sendTTY("<ZIMA_PASSWORD>");
                    enter();
                }, 500);
            }

            currentLine = "";
            break;
        }

        case "\b":
        case "\x7f":
            currentLine = currentLine.slice(0, -1);
            break;

        default:
            // Ignore escape sequences (arrow keys, Home, End, etc.)
            if (key.length === 1) {
                currentLine += key;
                console.log("Typing:", currentLine);
            }
            break;
    }
}

    return origSend.call(this, data);
};

    function sendTTY(text) {
        if (!ttySocket || ttySocket.readyState !== WebSocket.OPEN) return;

        injecting = true;
        ttySocket.send("0" + text);
        injecting = false;
    }

    function enter() {
        if (!ttySocket || ttySocket.readyState !== WebSocket.OPEN) return;

        injecting = true;
        ttySocket.send("0\r");
        injecting = false;
    }

    window.addEventListener("load", () => {
        const wait = setInterval(() => {
            if (!ttySocket) return;

            clearInterval(wait);

            setTimeout(() => {
                sendTTY("<ZIMA_USER>");
                enter();

                setTimeout(() => {
                    sendTTY("<ZIMA_PASSWORD>");
                    enter();
                }, 1000);

            }, 1000);

        }, 100);
    });

})();
