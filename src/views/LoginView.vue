<template>
  <div class="page-bg">
    <div class="card-wrapper">
      <div class="card">
        <div class="logo">
           <img src="/LogoClaro.png" alt="MapHub" />
        </div>

        <div class="fields">
          <div class="field-group">
            <label>Nombre de usuario</label>
            <input v-model="username" type="text" @keyup.enter="handleLogin" />
          </div>
          <div class="field-group">
            <label>Contraseña</label>
            <input v-model="password" type="password" @keyup.enter="handleLogin" />
          </div>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <div class="buttons">
          <button class="btn primary" @click="handleLogin">Entrar</button>
          <button class="btn ghost" @click="$router.push('/')">Volver</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      errorMsg: ''
    }
  },
  methods: {
 handleLogin() {
  this.errorMsg = ''

  if (!this.username || !this.password) {
    this.errorMsg = 'Completa todos los campos'
    return
  }

  // Buscar usuario en localStorage
  const usuarios = JSON.parse(localStorage.getItem('maphub_usuarios') || '[]')
  const usuario = usuarios.find(
    u => u.username === this.username && u.password === this.password
  )

  if (!usuario) {
    this.errorMsg = 'Usuario o contraseña incorrectos'
    return
  }

  // Guardar sesión
  localStorage.setItem('maphub_token', 'sesion_activa')
  localStorage.setItem('maphub_user', JSON.stringify({ username: this.username }))

  this.$router.push('/mapas')
}
  }

}
  /*  
   async handleLogin() {
  this.errorMsg = ''

  if (!this.username || !this.password) {
    this.errorMsg = 'Completa todos los campos'
    return
  }

  try {
    const res = await fetch('http://192.168.71.200:8080/terrestre2/api_login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password
      })
    })

    const data = await res.json()

    if (!res.ok) {
      this.errorMsg = data.message || 'Credenciales incorrectas'
      return
    }

    // Guardar token real que viene del servidor
    localStorage.setItem('maphub_token', data.token)
    localStorage.setItem('maphub_user', JSON.stringify({ username: this.username }))

    this.$router.push('/mapas')

  } catch (e) {
    this.errorMsg = 'Error de conexión. Intenta de nuevo.'
  }
}
  }
}
  */
 
/*
      // Buscar usuario en localStorage
      const usuarios = JSON.parse(localStorage.getItem('maphub_usuarios') || '[]')
      const usuario = usuarios.find(
        u => u.username === this.username && u.password === this.password
      )

      if (!usuario) {
        this.errorMsg = 'Usuario o contraseña incorrectos'
        return
      }

*/

/*
    // CONECTAR CON LA BD
const res = await fetch('http://192.168.71.200:8080/terrestre2/api_login.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: this.username, password: this.password })
})
const data = await res.json()
if (!res.ok) { this.errorMsg = data.message; return }
localStorage.setItem('maphub_token', data.token)
//En RegisterView.vue igual, cambias solo el bloque


*/
      
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
  width: 250px;
  padding: 32px 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}
.logo img {
  width: 225px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.7;
}
.logo svg { width: 120px; height: 60px; }
.fields { width: 100%; display: flex; flex-direction: column; gap: 14px; }
.field-group { display: flex; flex-direction: column; gap: 5px; }
label {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #8fa8c8;
}
input {
  background: #6b7fa3;
  border: none;
  border-radius: 999px;
  padding: 9px 14px;
  color: #d8e4f0;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: background 0.2s;
}
input:focus { background: #7e93b8; }
.error {
  color: #ff8a8a;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  text-align: center;
  margin: -10px 0;
}
.buttons { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 0;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}
.btn.primary { background: #6b7fa3; color: #d8e4f0; }
.btn.primary:hover { background: #7e93b8; }
.btn.ghost { background: transparent; color: #6b7fa3; font-size: 11px; padding: 6px 0; }
.btn.ghost:hover { color: #8fa8c8; }
</style>