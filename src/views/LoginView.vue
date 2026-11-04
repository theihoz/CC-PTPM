<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { safeRedirect, validateEmail } from '@/lib/validation'
import TextField from '@/components/TextField.vue'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const touched = reactive({ email: false, password: false })
const submitted = ref(false)
const busy = ref(false)
const serverError = ref('')

const errors = computed(() => ({
  email: validateEmail(form.email),
  password: form.password ? '' : 'Vui lòng nhập mật khẩu.',
}))
const show = (field) => (touched[field] || submitted.value ? errors.value[field] : '')
const redirect = computed(() => safeRedirect(route.query.redirect))
const registerLink = computed(() => ({
  name: 'register',
  query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

async function submit() {
  submitted.value = true
  serverError.value = ''
  if (errors.value.email || errors.value.password) return
  busy.value = true
  const result = await auth.signIn(form)
  busy.value = false
  if (!result.ok) {
    serverError.value = result.error
    return
  }
  toast.show(`Chào mừng trở lại, ${auth.displayName}!`)
  router.replace(redirect.value)
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <div class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 class="text-2xl font-bold">Đăng nhập</h1>
      <p v-if="route.query.redirect" class="mt-2 text-sm text-stone-600">
        Bạn cần đăng nhập để tiếp tục.
      </p>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <TextField
          v-model="form.email"
          label="Email"
          type="email"
          autocomplete="email"
          inputmode="email"
          required
          :error="show('email')"
          @blur="touched.email = true"
        />
        <TextField
          v-model="form.password"
          label="Mật khẩu"
          type="password"
          autocomplete="current-password"
          required
          :error="show('password')"
          @blur="touched.password = true"
        />

        <p
          v-if="serverError"
          role="alert"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {{ serverError }}
        </p>

        <button
          type="submit"
          :disabled="busy"
          class="w-full rounded-2xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {{ busy ? 'Đang đăng nhập…' : 'Đăng nhập' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-stone-600">
        Chưa có tài khoản?
        <RouterLink :to="registerLink" class="font-semibold text-brand-700 hover:underline">
          Đăng ký
        </RouterLink>
      </p>
    </div>
  </section>
</template>
