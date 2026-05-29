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

    // 오픈빌더는 params 또는 detailParams에 값을 담아 보냄
    const params = body.action?.params || {};
    const detailParams = body.action?.detailParams || {};

    // 두 곳 모두 확인해서 값 추출
    const getParam = (key: string): string => {
      if (params[key]) return params[key];
      if (detailParams[key]?.value) return detailParams[key].value;
      return "";
    };

    const product = getParam("product");
    const deadline = getParam("deadline") || "해당없음";
    const design = getParam("design");

    console.log("product:", product, "deadline:", deadline, "design:", design);

    // Apps Script에 저장 요청 + 주문번호 받기
    const completeRes = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        userId: body.userRequest?.user?.id || "unknown",
        product: product || "미입력",
        deadline: deadline,
        design: design || "미입력",
      }),
    });

    const result = await completeRes.json();
    console.log("결과:", JSON.stringify(result));

    const orderNum = result.orderNum || "오류";

    const text = `접수됐어요! 🎉\n주문번호 ${orderNum}\n\n📦 상품: ${product || "-"}\n📅 납기일: ${deadline}\n🎨 디자인: ${design || "-"}\n\n디자이너가 곧 연락드릴게요!\n연락받으실 번호를 채팅으로 보내주세요 😊`;

    return new Response(
      JSON.stringify({
        version: "2.0",
        template: { outputs: [{ simpleText: { text } }] },
      }),
      { headers: { "Content-Type": "application/json" } }
    );

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
