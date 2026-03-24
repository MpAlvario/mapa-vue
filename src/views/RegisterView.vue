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

        <div class="fields">
          <div class="field-group">
            <label>Nombre de usuario</label>
            <input v-model="username" type="text" @keyup.enter="handleRegister" />
          </div>
          <div class="field-group">
            <label>Contraseña</label>
            <input v-model="password" type="password" @keyup.enter="handleRegister" />
          </div>
          <div class="field-group">
            <label>Confirmar contraseña</label>
            <input v-model="confirmPassword" type="password" @keyup.enter="handleRegister" />
          </div>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success">{{ successMsg }}</p>

        <div class="buttons">
          <button class="btn primary" @click="handleRegister">Crear cuenta</button>
          <button class="btn ghost" @click="$router.push('/')">Volver</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RegisterView',
  data() {
    return {
      username: '',
      password: '',
      confirmPassword: '',
      errorMsg: '',
      successMsg: ''
    }
  },
  methods: {
    handleRegister() {
      this.errorMsg = ''
      this.successMsg = ''

      if (!this.username || !this.password || !this.confirmPassword) {
        this.errorMsg = 'Completa todos los campos'
        return
      }
      if (this.password !== this.confirmPassword) {
        this.errorMsg = 'Las contraseñas no coinciden'
        return
      }
      if (this.password.length < 6) {
        this.errorMsg = 'Mínimo 6 caracteres'
        return
      }

      // Revisar si el usuario ya existe
      const usuarios = JSON.parse(localStorage.getItem('maphub_usuarios') || '[]')
      const existe = usuarios.find(u => u.username === this.username)

      if (existe) {
        this.errorMsg = 'Ese usuario ya existe'
        return
      }

      // Guardar nuevo usuario
      usuarios.push({ username: this.username, password: this.password })
      localStorage.setItem('maphub_usuarios', JSON.stringify(usuarios))

      this.successMsg = '¡Cuenta creada! Redirigiendo...'
      setTimeout(() => this.$router.push('/login'), 1500)
    }
  }
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
  width: 210px;
  padding: 32px 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}
.logo svg { width: 120px; height: 60px; }
.fields { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 5px; }
label {
  font-family: 'Courier New', monospace;
  font-size: 11px;
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
  margin: -8px 0;
}
.success {
  color: #7dd87d;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  text-align: center;
  margin: -8px 0;
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