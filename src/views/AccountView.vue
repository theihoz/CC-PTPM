<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { normalizePhone, validateFullName, validatePhone } from '@/lib/validation'
import TextField from '@/components/TextField.vue'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const form = reactive({ fullName: '', phone: '', address: '' })
const errors = reactive({ fullName: '', phone: '' })
const busy = ref(false)

watch(
  () => auth.profile,
  (profile) => {
    form.fullName = profile?.full_name ?? ''
    form.phone = profile?.phone ?? ''
    form.address = profile?.default_address ?? ''
  },
  { immediate: true },
)

async function save() {
  errors.fullName = validateFullName(form.fullName)
  errors.phone = validatePhone(form.phone)
  if (errors.fullName || errors.phone) return
  busy.value = true
  const result = await auth.updateProfile({
    full_name: form.fullName.trim(),
    phone: normalizePhone(form.phone),
    default_address: form.address.trim(),
  })
  busy.value = false
  toast.show(result.ok ? 'Đã lưu thông tin tài khoản.' : result.error, {
    tone: result.ok ? 'success' : 'error',
  })
}

async function signOut() {
  await auth.signOut()
  toast.show('Bạn đã đăng xuất.', { tone: 'info' })
  router.replace({ name: 'home' })
}
</script>

<template>
  <section class="mx-auto max-w-lg space-y-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Tài khoản</h1>
        <p class="mt-1 text-sm text-stone-600">{{ auth.user?.email }}</p>
      </div>
      <button
        type="button"
        class="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        @click="signOut"
      >
        Đăng xuất
      </button>
    </header>

    <form
      class="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
      novalidate
      @submit.prevent="save"
    >
      <TextField
        v-model="form.fullName"
        label="Họ và tên"
        autocomplete="name"
        :error="errors.fullName"
      />
      <TextField
        v-model="form.phone"
        label="Số điện thoại"
        type="tel"
        autocomplete="tel"
        inputmode="tel"
        :error="errors.phone"
      />
      <TextField
        v-model="form.address"
        label="Địa chỉ giao hàng mặc định"
        autocomplete="street-address"
        hint="Sẽ được điền sẵn khi bạn đặt hàng."
      />
      <button
        type="submit"
        :disabled="busy"
        class="w-full rounded-2xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {{ busy ? 'Đang lưu…' : 'Lưu thông tin' }}
      </button>
    </form>
  </section>
</template>
