<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import {
  PASSWORD_MIN_LENGTH,
  safeRedirect,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
} from '@/lib/validation'
import TextField from '@/components/TextField.vue'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ fullName: '', phone: '', email: '', password: '', confirm: '' })
const touched = reactive({})
const submitted = ref(false)
const busy = ref(false)
const serverError = ref('')

const errors = computed(() => ({
  fullName: validateFullName(form.fullName),
  phone: validatePhone(form.phone),
  email: validateEmail(form.email),
  password: validatePassword(form.password),
  confirm: !form.confirm
    ? 'Vui lòng nhập lại mật khẩu.'
    : form.confirm !== form.password
      ? 'Mật khẩu nhập lại không khớp.'
      : '',
}))
const show = (field) => (touched[field] || submitted.value ? errors.value[field] : '')
const redirect = computed(() => safeRedirect(route.query.redirect))
const loginLink = computed(() => ({
  name: 'login',
  query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

async function submit() {
  submitted.value = true
  serverError.value = ''
  if (Object.values(errors.value).some(Boolean)) return
  busy.value = true
  const result = await auth.signUp(form)
  busy.value = false
  if (!result.ok) {
    serverError.value = result.error
    return
  }
  toast.show(`Đăng ký thành công. Chào mừng ${auth.displayName}!`)
  router.replace(redirect.value)
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <div class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 class="text-2xl font-bold">Tạo tài khoản</h1>
      <p class="mt-2 text-sm text-stone-600">Đăng ký để đặt món và theo dõi đơn hàng.</p>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <TextField
          v-model="form.fullName"
          label="Họ và tên"
          autocomplete="name"
          required
          :error="show('fullName')"
          @blur="touched.fullName = true"
        />
        <TextField
          v-model="form.phone"
          label="Số điện thoại"
          type="tel"
          autocomplete="tel"
          inputmode="tel"
          required
          hint="Dùng để shipper liên hệ khi giao hàng."
          :error="show('phone')"
          @blur="touched.phone = true"
        />
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
          autocomplete="new-password"
          required
          :hint="`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự, có cả chữ và số.`"
          :error="show('password')"
          @blur="touched.password = true"
        />
        <TextField
          v-model="form.confirm"
          label="Nhập lại mật khẩu"
          type="password"
          autocomplete="new-password"
          required
          :error="show('confirm')"
          @blur="touched.confirm = true"
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
          {{ busy ? 'Đang tạo tài khoản…' : 'Đăng ký' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-stone-600">
        Đã có tài khoản?
        <RouterLink :to="loginLink" class="font-semibold text-brand-700 hover:underline">
          Đăng nhập
        </RouterLink>
      </p>
    </div>
  </section>
</template>
