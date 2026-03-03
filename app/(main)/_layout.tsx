import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="minuta-detail" />
    </Stack>
  );
}
