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

    // 오픈빌더는 params, detailParams, clientExtra 세 곳 중 하나에 값을 담아 보냄
    const params = body.action?.params || {};
    const detailParams = body.action?.detailParams || {};
    const clientExtra = body.action?.clientExtra || {};

    // 세 곳 모두 확인해서 값 추출
    const getParam = (key: string): string => {
      if (params[key]) return params[key];
      if (detailParams[key]?.value) return detailParams[key].value;
      if (clientExtra[key]) return clientExtra[key];
      return "";
    };

    const product = getParam("product");
    const deadline = getParam("deadline") || "해당없음";
    const design = getParam("design");

    // 주문번호 생성
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = kst.toISOString().slice(2, 10).replace(/-/g, "");
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    const orderNum = "#" + dateStr + "-" + seq;
    const dateTime = kst.toISOString().slice(0, 16).replace("T", " ");

    // Apps Script로 시트 저장 (await 없이 백그라운드 처리)
    const sheetUrl = "https://script.google.com/macros/s/AKfycbwvBcznAjqsF05Qkez6K57mODpZWZv31UswSKv2p2ElOXeF29pksAq3G4jwgEurNVij/exec";
    fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        주문번호: orderNum,
        날짜: dateTime,
        상품: product || "미입력",
        납기일: deadline,
        디자인파일: design || "미입력",
        상태: "접수완료",
      }),
    });

    // 카톡 응답 즉시 반환
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
