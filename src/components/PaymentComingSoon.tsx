export function PaymentComingSoon({
  kind,
}: {
  kind: "storybook" | "sticker";
}) {
  const detail =
    kind === "storybook"
      ? "표지와 장면 미리보기는 저장되어 있어요. 결제가 열리면 이어서 완성할 수 있어요."
      : "스티커 미리보기는 저장되어 있어요. 결제가 열리면 이어서 주문할 수 있어요.";

  return (
    <div className="rounded-2xl bg-stone-50 px-5 py-8 text-center ring-1 ring-stone-200">
      <p className="text-sm font-semibold text-stone-800">
        결제는 아직 준비 중이에요
      </p>
      <p className="mt-2 text-sm text-stone-500">{detail}</p>
    </div>
  );
}
