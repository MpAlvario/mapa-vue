<template>
  <div class="page-bg">
    <div class="card-wrapper">
      <div class="card">
        <div class="logo">
          <svg viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="4" y="38" font-family="'Courier New', monospace" font-size="34"
              fill="none" stroke="#8fa8c8" stroke-width="1.5" letter-spacing="-1">map</text>
            <text x="58" y="55" font-family="'Courier New', monospace" font-size="28"
              fill="none" stroke="#8fa8c8" stroke-width="1.5" letter-spacing="-1">hub</text>
            <circle cx="10" cy="12" r="4" stroke="#8fa8c8" stroke-width="1.5" fill="none"/>
            <line x1="10" y1="16" x2="10" y2="24" stroke="#8fa8c8" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="buttons">
          <button class="btn" @click="$router.push('/login')">Iniciar Sesión</button>
          <button class="btn" @click="$router.push('/register')">Registrarse</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WelcomeView'
}
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  background: #d4d4d4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card {
  background: #1e3a6e;
  border-radius: 20px;
  width: 200px;
  padding: 36px 28px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}
.logo svg { width: 120px; height: 60px; }
.buttons { display: flex; flex-direction: column; gap: 12px; width: 100%; }
.btn {
  background: #6b7fa3;
  color: #d8e4f0;
  border: none;
  border-radius: 999px;
  padding: 10px 0;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}
.btn:hover { background: #7e93b8; }
</style>