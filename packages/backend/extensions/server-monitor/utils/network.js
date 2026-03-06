import net from 'net';

export function testTcpConnect(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ success: true, message: `Port ${port} open` });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, message: 'Connection timeout' });
    });
    socket.on('error', (err) => {
      resolve({ success: false, message: err.message });
    });
    socket.connect(port, host);
  });
}
