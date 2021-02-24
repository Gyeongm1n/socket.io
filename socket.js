const SocketIO = require('socket.io');
const axios = require('axios');
const ios = require('express-socket.io-session');

module.exports = (server, app, sessionMiddleware) => {
    const io = SocketIO(server, {path: '/socket.io'});
    app.set('io', io);// 라우터에서 io(웹소켓 서버) 객체를 사용하기 위해
    const room = io.of('/room');
    const chat = io.of('/chat');

    chat.use(ios(sessionMiddleware, {autoSave: true}));

    room.on('connection', (socket) => {
        console.log('room 네임스페이스 접속', socket.id);
        socket.on('disconnect', () => {
            console.log('room 네임스페이스 접속 해제');
        });
    });

    chat.on('connection', (socket) => {
        console.log('chat 네임스페이스 접속');
        const req = socket.request;
        const {headers: {referer}} = req;
        console.log('pgm1', referer);
        const roomId = referer
            .split('/')[referer.split('/').length - 1]
            .replace(/\?.+/, '');
        console.log('pgm2', roomId);
        socket.join(roomId);
        console.log('pgm12', socket.adapter, socket.adapter.rooms.get(roomId).size);
       // console.log('pgm7', socket.handshake.headers.cookie, socket.handshake.session.color);
        socket.to(roomId).emit('join', {
            user: 'system',
            chat: `${socket.handshake.session.color}님이 입장했습니다.`,
        });

        socket.on('disconnect', () => {
            console.log('chat 네임스페이스 접속 해제');
            socket.leave(roomId);
            console.log('pgm11', socket.adapter.rooms.get(roomId));
            const currentRoom = socket.adapter.rooms.get(roomId);
            const userCount = currentRoom ? true : false;
            console.log('pgm8', currentRoom, userCount);
            //console.log('pgm9', req);
            if (!userCount) {
                axios.delete(`http://localhost:8005/room/${roomId}`, {
                    headers: {
                        Cookie: socket.handshake.headers.cookie,
                    },
                })
                    .then(() => {
                        console.log('방 제거 요청 성공');
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            } else {
                socket.to(roomId).emit('exit', {
                    user: 'system',
                    chat: `${socket.handshake.session.color}님이 퇴장했습니다.`,
                });
            }
        });
    });
};