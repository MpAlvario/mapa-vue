<template>
  <div class="login-container">

    <h2>Monitoreo Marino</h2>

    <input 
      v-model="username" 
      placeholder="Usuario"
    />

    <input 
      v-model="password" 
      type="password"
      placeholder="Contraseña"
    />

    <button @click="login">
      Ingresar
    </button>

    <p v-if="error" class="error">
      {{ error }}
    </p>

  </div>
</template>

<script>
export default {
  data() {
    return {
      username: "",
      password: "",
      error: null
    }
  },

  methods: {
    async login() {

      this.error = null

      try {

        const res = await fetch(
          "http://192.168.71.54:8080/proyecto/login.php",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              username: this.username,
              password: this.password
            })
          }
        )

        const json = await res.json()

        if (!json.ok) {
          this.error = json.error
          return
        }

        this.$router.push("/mapa")

      } catch (err) {
        this.error = "Error de conexión"
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  width: 320px;
  margin: 100px auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
}

button {
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: black;
  color: white;
  cursor: pointer;
}

.error {
  color: red;
}
</style>
