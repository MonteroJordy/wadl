import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ color, fontSize: 18, fontWeight: "900" }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#111111",
          borderTopColor: "rgba(255,255,255,0.07)",
          height: 84,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarActiveTintColor: "#FF4A2B",
        tabBarInactiveTintColor: "rgba(242,237,228,0.5)",
        tabBarLabelStyle: {
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1.4,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Tonight",
          tabBarIcon: ({ color }) => <TabIcon glyph="◎" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mytickets"
        options={{
          title: "Tickets",
          tabBarIcon: ({ color }) => <TabIcon glyph="◇" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Door",
          tabBarIcon: ({ color }) => <TabIcon glyph="◭" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Me",
          tabBarIcon: ({ color }) => <TabIcon glyph="●" color={color} />,
        }}
      />
    </Tabs>
  );
}
