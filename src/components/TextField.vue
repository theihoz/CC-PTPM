<script setup>
import { computed, ref, useId } from 'vue'

const model = defineModel({ type: String, default: '' })
const props = defineProps({
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  inputmode: { type: String, default: undefined },
  required: { type: Boolean, default: false },
})
defineEmits(['blur'])

const id = useId()
const showPassword = ref(false)
const inputType = computed(() =>
  props.type === 'password' && showPassword.value ? 'text' : props.type,
)
const describedBy = computed(
  () =>
    [props.error && `${id}-error`, props.hint && `${id}-hint`].filter(Boolean).join(' ') ||
    undefined,
)
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="block text-sm font-medium">
      {{ label }}<span v-if="required" class="text-red-600" aria-hidden="true"> *</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="w-full rounded-xl border bg-white px-4 py-2.5 focus-visible:border-brand-600"
        :class="[error ? 'border-red-400' : 'border-stone-300', type === 'password' && 'pr-16']"
        @blur="$emit('blur')"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-xs font-medium text-stone-600 hover:bg-stone-100"
        :aria-pressed="showPassword"
        @click="showPassword = !showPassword"
      >
        {{ showPassword ? 'Ẩn' : 'Hiện' }}
      </button>
    </div>
    <p v-if="hint && !error" :id="`${id}-hint`" class="text-xs text-stone-500">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="text-sm text-red-700">{{ error }}</p>
  </div>
</template>
