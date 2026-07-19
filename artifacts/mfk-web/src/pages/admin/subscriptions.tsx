import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/commerce/commerce-components";
import { getValidSupabaseSession, supabaseRequest } from "@/lib/supabase";

type SupabaseSubscription = {
  id: string;
  user_id: string;
  plan?: string | null;
  status?: string | null;
  started_at?: string | null;
  ends_at?: string | null;
  users?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    subscription_auto_renew?: boolean | null;
  } | null;
};

type SupabaseUserSubscription = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  subscription_tier?: string | null;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  subscription_auto_renew?: boolean | null;
  is_active?: boolean | null;
  created_at: string;
};

type AdminSubscriptionRow = {
  id: string;
  customer: string;
  phone?: string | null;
  email?: string | null;
  plan: string;
  status: string;
  startedAt?: string | null;
  endsAt?: string | null;
  autoRenew?: boolean | null;
  source: "subscriptions" | "users";
};

async function fetchSupabaseSubscriptions() {
  const session = await getValidSupabaseSession();
  if (!session?.access_token) throw new Error("يلزم تسجيل الدخول بحساب أدمن.");

  const [subscriptions, users] = await Promise.all([
    supabaseRequest<SupabaseSubscription[]>(
      "/rest/v1/subscriptions?select=id,user_id,plan,status,started_at,ends_at,users(name,phone,email,subscription_auto_renew)&order=started_at.desc",
      { method: "GET" },
      session.access_token,
    ),
    supabaseRequest<SupabaseUserSubscription[]>(
      "/rest/v1/users?select=id,name,phone,email,subscription_tier,subscription_started_at,subscription_ends_at,subscription_auto_renew,is_active,created_at&order=created_at.desc",
      { method: "GET" },
      session.access_token,
    ),
  ]);

  if (subscriptions.length > 0) {
    return subscriptions.map<AdminSubscriptionRow>((subscription) => ({
      id: subscription.id,
      customer: subscription.users?.name || "غير محدد",
      phone: subscription.users?.phone,
      email: subscription.users?.email,
      plan: subscription.plan || "free",
      status: subscription.status || "active",
      startedAt: subscription.started_at,
      endsAt: subscription.ends_at,
      autoRenew: subscription.users?.subscription_auto_renew,
      source: "subscriptions",
    }));
  }

  return users.map<AdminSubscriptionRow>((user) => ({
    id: user.id,
    customer: user.name,
    phone: user.phone,
    email: user.email,
    plan: user.subscription_tier || "free",
    status: user.is_active === false ? "inactive" : "active",
    startedAt: user.subscription_started_at || user.created_at,
    endsAt: user.subscription_ends_at,
    autoRenew: user.subscription_auto_renew,
    source: "users",
  }));
}

function planLabel(plan?: string | null) {
  switch (plan) {
    case "plus":
    case "mofk":
      return "مفك";
    case "premium":
      return "احترافي";
    case "pro":
      return "متقدم";
    case "family":
      return "العائلة";
    case "fleet":
      return "الأسطول";
    default:
      return "مجاني";
  }
}

function statusBadge(status?: string | null) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 text-white">نشط</Badge>;
    case "trialing":
      return <Badge variant="secondary">تجربة</Badge>;
    case "past_due":
      return <Badge className="bg-amber-600 text-white">متأخر</Badge>;
    case "canceled":
    case "inactive":
      return <Badge variant="outline">غير نشط</Badge>;
    default:
      return <Badge variant="outline">{status || "غير محدد"}</Badge>;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return format(new Date(value), "d MMMM yyyy", { locale: ar });
}

export default function AdminSubscriptions() {
  const {
    data: subscriptions = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-subscriptions", "supabase"],
    queryFn: fetchSupabaseSubscriptions,
    retry: 1,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة الاشتراكات"
        description="بيانات الاشتراكات والباقات الحقيقية من Supabase."
      />

      <Card>
        {isError && (
          <div className="border-b bg-destructive/10 px-4 py-3 text-sm text-destructive">
            تعذر جلب الاشتراكات من Supabase:{" "}
            {error instanceof Error ? error.message : "تحقق من صلاحيات الأدمن."}
          </div>
        )}

        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : subscriptions.length > 0 ? (
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "العميل",
                    "الباقة",
                    "الحالة",
                    "البداية",
                    "النهاية",
                    "تجديد تلقائي",
                    "المصدر",
                  ].map((head) => (
                    <th key={head} className="p-3 text-right">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-t">
                    <td className="p-3">
                      <div className="font-bold">{subscription.customer}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {subscription.phone || subscription.email || "-"}
                      </div>
                    </td>
                    <td className="p-3">{planLabel(subscription.plan)}</td>
                    <td className="p-3">{statusBadge(subscription.status)}</td>
                    <td className="p-3">{formatDate(subscription.startedAt)}</td>
                    <td className="p-3">{formatDate(subscription.endsAt)}</td>
                    <td className="p-3">{subscription.autoRenew === false ? "لا" : "نعم"}</td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {subscription.source === "subscriptions" ? "subscriptions" : "users"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={CreditCard}
                title="لا توجد اشتراكات"
                description="لا توجد بيانات اشتراكات في Supabase حتى الآن."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
