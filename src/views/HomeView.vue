<script setup>
import { formatVND } from '@/lib/format'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
</script>

<template>
  <section
    class="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-12 text-white sm:px-12"
  >
    <h1 class="text-3xl font-bold sm:text-4xl">Đói bụng? Đặt món ngay.</h1>
    <p class="mt-3 max-w-xl text-brand-50">
      Tìm quán ngon quanh bạn, tùy chỉnh món theo ý thích và để AI gợi ý thực đơn phù hợp khẩu vị.
    </p>
    <p class="mt-6 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm">
      Miễn phí giao hàng cho đơn từ {{ formatVND(FREE_SHIPPING_THRESHOLD) }}
    </p>
  </section>
</template>
