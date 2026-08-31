<template>
  <div class="stat-grid">
    <div v-for="card in cards" :key="card.label" class="stat-card">
      <div class="stat-icon" :style="{ background: card.bg, color: card.color }">
        <el-icon :size="20"><component :is="card.icon" /></el-icon>
      </div>
      <div class="stat-body">
        <p class="stat-label">{{ card.label }}</p>
        <p class="stat-value">{{ card.value }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ cards: { type: Array, default: () => [] } })
</script>

<style lang="scss" scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 900px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  .stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-body {
    min-width: 0;
  }

  .stat-label {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    margin: 4px 0 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
  }
}
</style>
