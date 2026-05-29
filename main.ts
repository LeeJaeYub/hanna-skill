Deno.serve(async (request: Request) => {
  // CORS 처리 - 오픈빌더가 OPTIONS 요청을 먼저 보내는 경우 대응
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

    // 오픈빌더는 params 또는 detailParams 둘 중 하나에 값을 담아 보냄
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

    // 주문번호 생성
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = kst.toISOString().slice(2, 10).replace(/-/g, "");
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    const orderNum = "#" + dateStr + "-" + seq;
    const dateTime = kst.toISOString().slice(0, 16).replace("T", " ");

    // Google Sheets 저장
    const sheetUrl = "https://api.sheety.co/45025b27255e00fb81f2402fd95ee8d1/문의접수/문의접수";
    await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "문의접수": {
          "주문번호": orderNum,
          "날짜": dateTime,
          "상품": product || "미입력",
          "납기일": deadline,
          "디자인파일": design || "미입력",
          "상태": "접수완료",
        },
      }),
    });

    // 카톡 응답 텍스트 - 값이 없어도 빈 문자열이 되지 않도록 기본값 설정
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
    // 에러가 나도 오픈빌더가 받을 수 있는 응답을 반드시 보냄
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
