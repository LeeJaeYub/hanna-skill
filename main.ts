const kv = await Deno.openKv();

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const body = await request.json();
    console.log("받은 데이터:", JSON.stringify(body));

    const userId = body.userRequest?.user?.id || "unknown";
    const clientExtra = body.action?.clientExtra || {};
    const blockName = body.userRequest?.block?.name || "";

    // 기존 세션 불러오기
    const sessionEntry = await kv.get(["session", userId]);
    const session: Record<string, string> =
      (sessionEntry.value as Record<string, string>) || {};

    // 값 누적 저장
    if (clientExtra.product) session.product = clientExtra.product;
    if (clientExtra.deadline) session.deadline = clientExtra.deadline;
    if (clientExtra.design) session.design = clientExtra.design;

    await kv.set(["session", userId], session, { expireIn: 3600000 });
    console.log("현재 세션:", JSON.stringify(session));

    // 접수완료 블록에서만 최종 처리
    if (blockName === "접수완료") {
      const product = session.product || "미입력";
      const deadline = session.deadline || "해당없음";
      const design = session.design || "미입력";

      const now = new Date();
      const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const dateStr = kst.toISOString().slice(2, 10).replace(/-/g, "");
      const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
      const orderNum = "#" + dateStr + "-" + seq;
      const dateTime = kst.toISOString().slice(0, 16).replace("T", " ");

      const sheetUrl = "https://script.google.com/macros/s/AKfycbwvBcznAjqsF05Qkez6K57mODpZWZv31UswSKv2p2ElOXeF29pksAq3G4jwgEurNVij/exec";
      fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          주문번호: orderNum,
          날짜: dateTime,
          상품: product,
          납기일: deadline,
          디자인파일: design,
          상태: "접수완료",
        }),
      });

      await kv.delete(["session", userId]);

      const text = `접수됐어요! 🎉\n주문번호 ${orderNum}\n\n📦 상품: ${product}\n📅 납기일: ${deadline}\n🎨 디자인: ${design}\n\n디자이너가 곧 연락드릴게요!\n연락받으실 번호를 채팅으로 보내주세요 😊`;

      return new Response(
        JSON.stringify({
          version: "2.0",
          template: { outputs: [{ simpleText: { text } }] },
        }),
        { headers: { "Content-Type": "application/json" } }
      );

    } else {
      // 중간 블록: 눈에 안 보이는 공백 문자로 응답
      return new Response(
        JSON.stringify({
          version: "2.0",
          template: { outputs: [{ simpleText: { text: "\u200b" } }] },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    console.log("에러:", err);
    return new Response(
      JSON.stringify({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "접수가 완료됐어요! 디자이너가 곧 연락드릴게요 😊" } }],
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
});
