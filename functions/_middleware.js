export async function onRequest(context) {
  const url = new URL(context.request.url)
  
  // Kalau dia coba akses file .lua langsung
  if (url.pathname.endsWith('.lua')) {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Oops!</title>
        <style>
          body {
            background-color: #fff5f5;
            color: #ff0066;
            font-family: Comic Sans MS, cursive, sans-serif;
            text-align: center;
            padding-top: 100px;
          }
          h1 {
            font-size: 48px;
            animation: wiggle 0.4s infinite alternate;
          }
          @keyframes wiggle {
            from { transform: rotate(-2deg); }
            to { transform: rotate(2deg); }
          }
          p {
            font-size: 24px;
            margin-top: 20px;
          }
          .emoji {
            font-size: 64px;
            animation: bounce 0.6s infinite alternate;
          }
          @keyframes bounce {
            from { transform: translateY(0); }
            to { transform: translateY(-10px); }
          }
        </style>
      </head>
      <body>
        <div class="emoji">🫵😹</div>
        <h1>Ketahuan Ngintip!</h1>
        <p>Script-nya udah disembunyiin, bos 😎</p>
        <p>Mau nyolong? Jangan mimpi 🙃</p>
        <p>Upload ulang sama kredibilitas lo deh 🤡</p>
      </body>
      </html>
    `, {
      status: 404,
      headers: { 'content-type': 'text/html' }
    })
  }

  return context.next()
}
