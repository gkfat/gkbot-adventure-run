<template>
    <v-navigation-drawer
        :model-value="modelValue"
        location="right"
        temporary
        width="280"
        color="background"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <div class="account-drawer d-flex flex-column fill-height">
            <!-- 帳號資訊 -->
            <div class="pa-5 text-center">
                <v-avatar
                    size="64"
                    color="dark"
                    class="mb-3"
                >
                    <v-img
                        v-if="user?.photoURL"
                        :src="user.photoURL"
                        :alt="user.displayName || 'User'"
                    />
                    <v-icon
                        v-else
                        icon="mdi-account"
                        size="32"
                    />
                </v-avatar>

                <div class="text-subtitle-1 font-weight-medium">
                    {{ user?.displayName || '未知使用者' }}
                </div>
                <div class="text-caption text-medium-emphasis mb-2">
                    {{ user?.email }}
                </div>

                <div
                    v-if="character"
                    class="mt-2"
                >
                    <span class="text-caption text-medium-emphasis">
                        {{ character.nickname }}
                    </span>
                </div>
            </div>

            <v-divider />

            <div class="pa-2">
                <button
                    v-if="character"
                    type="button"
                    class="account-drawer__menu-item pixel-press"
                    @click="handleSwitchCharacter"
                >
                    <v-icon
                        icon="mdi-account-switch-outline"
                        size="20"
                        color="primary"
                    />
                    <span class="text-body-2">切換角色</span>
                </button>
            </div>

            <v-spacer />

            <!-- 登出 -->
            <div class="pa-4">
                <SystemBtn
                    block
                    color="warning"
                    variant="outlined"
                    class="text-none"
                    prepend-icon="mdi-logout"
                    :loading="loading"
                    @click="handleSignOut"
                >
                    登出
                </SystemBtn>
            </div>
        </div>
    </v-navigation-drawer>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const { user, signOut, loading } = useAuth();
const { character, clearSelection, reset: resetCharacter } = useCharacter();
const { reset: resetInventory } = useInventory();

const handleSignOut = async () => {
    await signOut();
    resetCharacter();
    resetInventory();
};

const handleSwitchCharacter = () => {
    clearSelection();
    emit('update:modelValue', false);
    // 角色選擇畫面只存在於 /main；若是在其他頁面（例如背包）切換角色，需先導回去
    navigateTo('/main');
};
</script>

<style scoped lang="scss">
.account-drawer__menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background: none;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    text-align: left;

    &:hover {
        background: rgba(196, 203, 219, 0.08);
    }

    &:active {
        background: rgba(196, 203, 219, 0.14);
    }

    &:focus-visible {
        outline: 2px solid rgb(var(--v-theme-primary));
        outline-offset: -2px;
    }
}
</style>
