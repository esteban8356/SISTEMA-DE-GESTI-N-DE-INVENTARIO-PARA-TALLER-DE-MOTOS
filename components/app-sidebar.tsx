import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Wrench, Package, Users, Settings, LayoutDashboard } from "lucide-react";
import Link from "next/link";

const items = [
  {
    title: "Panel de Control",
    url: "/protected",
    icon: LayoutDashboard,
  },
  {
    title: "Inventario",
    url: "/protected/inventory",
    icon: Package,
  },
  {
    title: "Órdenes de Trabajo",
    url: "/protected/orders",
    icon: Wrench,
  },
  {
    title: "Clientes",
    url: "/protected/customers",
    icon: Users,
  },
  {
    title: "Configuración",
    url: "/protected/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-600 font-bold text-lg py-4">MotoGest</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
