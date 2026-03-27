<template>
  <div class="page-bg">
    <div class="card-wrapper">
      <div class="card">
        <div class="logo">
           <img src="/LogoClaro.png" alt="MapHub" />
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
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.page-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/FondoLogin.png');
  background-size: cover;
  background-position: center;
  filter: blur(4px) brightness(0.6);
  transform: scale(1.05);
  z-index: 0;
}

.card-wrapper {
  position: relative;
  z-index: 1;
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
.logo img {
  width: 225px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.7;
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