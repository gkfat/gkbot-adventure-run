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
                    class="d-flex align-center justify-center ga-2 mt-2"
                >
                    <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-green));">
                        LV {{ character.level }}
                    </span>
                    <span class="text-caption text-medium-emphasis">
                        {{ character.nickname }}
                    </span>
                </div>
            </div>

            <v-divider />

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
defineEmits<{ 'update:modelValue': [value: boolean] }>();

const { user, signOut, loading } = useAuth();
const { character } = useCharacter();

const handleSignOut = async () => {
    await signOut();
};
</script>
