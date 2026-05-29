const SHEET_URL = "https://script.google.com/macros/s/AKfycbwvBcznAjqsF05Qkez6K57mODpZWZv31UswSKv2p2ElOXeF29pksAq3G4jwgEurNVij/exec";

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

    console.log("블록명:", blockName);
    console.log("clientExtra:", JSON.stringify(clientExtra));

    if (blockName === "접수완료") {
      // 마지막 블록: design 저장 후 complete 호출
      // 먼저 design 값을 세션에 저장
      if (clientExtra.design) {
        await fetch(SHEET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            userId,
            design: clientExtra.design,
          }),
        });
      }

      // 세션에서 전체 데이터 꺼내서 최종 저장
      const completeRes = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          userId,
        }),
      });

      const result = await completeRes.json();
      console.log("최종 결과:", JSON.stringify(result));

      const orderNum = result.orderNum || "오류";
      const product = result.product || "-";
      const deadline = result.deadline || "-";
      const design = result.design || "-";

      const text = `접수됐어요! 🎉\n주문번호 ${orderNum}\n\n📦 상품: ${product}\n📅 납기일: ${deadline}\n🎨 디자인: ${design}\n\n디자이너가 곧 연락드릴게요!\n연락받으실 번호를 채팅으로 보내주세요 😊`;

      return new Response(
        JSON.stringify({
          version: "2.0",
          template: { outputs: [{ simpleText: { text } }] },
        }),
        { headers: { "Content-Type": "application/json" } }
      );

    } else {
      // 중간 블록: clientExtra 값을 Apps Script 세션에 저장
      const saveData: Record<string, string> = { action: "save", userId };
      if (clientExtra.product) saveData.product = clientExtra.product;
      if (clientExtra.deadline) saveData.deadline = clientExtra.deadline;
      if (clientExtra.design) saveData.design = clientExtra.design;

      await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      });

      // 눈에 안 보이는 공백 문자로 응답 (오류 없이 다음 블록으로 이동)
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
