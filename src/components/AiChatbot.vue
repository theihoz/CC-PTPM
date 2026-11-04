<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useMenuStore } from '@/stores/menu'
import { useAddToCart } from '@/composables/useAddToCart'
import ChatFoodCard from './ChatFoodCard.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const SAMPLE_QUESTIONS = [
  'Món cay dưới 500 calo',
  'Đồ chay nhẹ bụng',
  'Tập gym cần nhiều đạm',
  'Đồ uống mát lạnh',
  'Tráng miệng ngọt ngào',
]

const chat = useChatStore()
const menu = useMenuStore()
const { add, pendingSwitch, confirmSwitch, cancelSwitch } = useAddToCart()

const draft = ref('')
const input = ref(null)
const scroller = ref(null)

const foodsOf = (message) => (message.foodIds ?? []).map((id) => menu.foodById(id)).filter(Boolean)
const empty = computed(() => chat.messages.length === 0)

async function scrollToEnd() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
}

watch(
  () => chat.open,
  async (open) => {
    if (!open) return
    menu.load()
    await nextTick()
    input.value?.focus()
    scrollToEnd()
  },
)
watch(() => [chat.messages.length, chat.thinking], scrollToEnd)

function ask(text) {
  const message = (text ?? draft.value).trim()
  if (!message || chat.thinking) return
  draft.value = ''
  chat.send(message)
}

// Thêm từ khung chat: size mặc định, không topping, 1 phần. Vẫn đi qua cart store
// nên tôn trọng tồn kho và quy tắc một giỏ một quán.
function addFood(food) {
  add({ foodId: food.id, quantity: 1 })
}
</script>

<template>
  <button
    v-if="!chat.open"
    type="button"
    class="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-lg hover:bg-brand-700"
    aria-haspopup="dialog"
    @click="chat.open = true"
  >
    <span aria-hidden="true" class="text-xl">🤖</span>
    <span class="hidden sm:inline">Hỏi AI gợi ý món</span>
    <span class="sr-only sm:hidden">Mở trợ lý AI gợi ý món</span>
  </button>

  <section
    v-else
    role="dialog"
    aria-modal="false"
    aria-labelledby="chatbot-title"
    class="fixed inset-x-2 bottom-2 z-40 flex h-[min(38rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
    @keydown.esc="chat.open = false"
  >
    <header class="flex items-center justify-between gap-2 bg-brand-600 px-4 py-3 text-white">
      <div>
        <h2 id="chatbot-title" class="font-semibold">🤖 Trợ lý FoodieGo</h2>
        <p class="text-xs text-brand-50">Gợi ý món theo khẩu vị, calo, sở thích</p>
      </div>
      <button
        type="button"
        class="rounded-lg p-2 hover:bg-white/15"
        aria-label="Đóng trợ lý AI"
        @click="chat.open = false"
      >
        ✕
      </button>
    </header>

    <div ref="scroller" class="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
      <div v-if="empty" class="rounded-xl bg-white p-3 text-sm text-stone-700">
        Chào bạn! Hãy cho mình biết bạn thèm gì, ví dụ “món cay dưới 500 calo” hoặc “đồ chay nhẹ
        bụng”.
      </div>

      <template v-for="message in chat.messages" :key="message.id">
        <p
          v-if="message.role === 'user'"
          class="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white"
        >
          {{ message.text }}
        </p>
        <div v-else class="max-w-[95%] space-y-2">
          <p
            class="w-fit rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-stone-800 shadow-sm"
          >
            {{ message.text }}
          </p>
          <p v-if="message.notice" class="text-xs text-amber-700">{{ message.notice }}</p>
          <ul v-if="foodsOf(message).length" class="space-y-2">
            <ChatFoodCard
              v-for="food in foodsOf(message)"
              :key="food.id"
              :food="food"
              @add="addFood"
            />
          </ul>
        </div>
      </template>

      <p
        v-if="chat.thinking"
        class="flex w-fit items-center gap-1 rounded-2xl bg-white px-3 py-2 text-sm text-stone-500 shadow-sm"
        role="status"
      >
        Đang suy nghĩ
        <span class="flex gap-0.5" aria-hidden="true">
          <span class="size-1.5 animate-bounce rounded-full bg-stone-400" />
          <span class="size-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:150ms]" />
          <span class="size-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:300ms]" />
        </span>
      </p>
    </div>

    <div class="border-t border-stone-200 bg-white p-3">
      <div v-if="empty" class="mb-2 flex flex-wrap gap-1.5" aria-label="Câu hỏi mẫu">
        <button
          v-for="question in SAMPLE_QUESTIONS"
          :key="question"
          type="button"
          class="rounded-full border border-stone-300 px-3 py-1 text-xs hover:border-brand-500 hover:bg-brand-50"
          :disabled="chat.thinking"
          @click="ask(question)"
        >
          {{ question }}
        </button>
      </div>
      <form class="flex gap-2" @submit.prevent="ask()">
        <label for="chatbot-input" class="sr-only">Câu hỏi cho trợ lý AI</label>
        <input
          id="chatbot-input"
          ref="input"
          v-model="draft"
          type="text"
          maxlength="500"
          autocomplete="off"
          placeholder="Bạn muốn ăn gì?"
          class="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus-visible:border-brand-600"
        />
        <button
          type="submit"
          :disabled="chat.thinking || !draft.trim()"
          class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Gửi
        </button>
      </form>
    </div>
  </section>

  <ConfirmDialog
    :open="Boolean(pendingSwitch)"
    title="Xóa giỏ hiện tại?"
    :message="
      pendingSwitch
        ? `Giỏ hàng đang có món của ${pendingSwitch.currentName}. Mỗi đơn chỉ đặt từ một quán, bạn có muốn xóa giỏ hiện tại để thêm món từ ${pendingSwitch.nextName}?`
        : ''
    "
    confirm-label="Xóa giỏ và thêm món"
    cancel-label="Giữ giỏ hiện tại"
    danger
    @confirm="confirmSwitch"
    @cancel="cancelSwitch"
  />
</template>
