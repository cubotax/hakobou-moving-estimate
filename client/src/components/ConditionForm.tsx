const onSubmit = async (data: Step2FormData) => {
  // データを保存
  setStep2Data(data);

  // 見積もりを計算
  const distanceData = getDistanceData();
  const step1Data = getStep1Data();

  if (distanceData && step1Data) {
    const options: EstimateOptions = {
      hasElevatorPickup: data.hasElevatorPickup,
      floorPickup: data.floorPickup,
      hasElevatorDelivery: data.hasElevatorDelivery,
      floorDelivery: data.floorDelivery,
      needsPacking: data.needsPacking,
    };

    // 日付データを取得
    const dates: MovingDates | undefined = step1Data?.dates ? {
      pickupDate: step1Data.dates.pickupDate,
      deliveryDate: step1Data.dates.deliveryDate,
    } : undefined;

    const result = calculateEstimate(distanceData, options, dates);
    setEstimateResult(result);

    // バックエンドAPIに見積もりデータを送信
    try {
      const response = await fetch('https://hakobou-mitsumori.fly.dev/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickupAddress: step1Data.pickupAddress,
          deliveryAddress: step1Data.deliveryAddress,
          dates: step1Data.dates,
          totalFee: result.totalFee,
          distanceKm: result.distanceKm,
          conditions: {
            floorPickup: data.floorPickup,
            hasElevatorPickup: data.hasElevatorPickup,
            floorDelivery: data.floorDelivery,
            hasElevatorDelivery: data.hasElevatorDelivery,
            needsPacking: data.needsPacking,
          },
          plan: data.plan,
        }),
      });

      const responseData = await response.json();

      if (responseData.success) {
        // estimateIdとliffUrlをローカルストレージに保存
        localStorage.setItem('estimateId', responseData.estimateId);
        localStorage.setItem('liffUrl', responseData.liffUrl);
      }
    } catch (error) {
      console.error('Failed to save estimate:', error);
      // エラーでも結果ページには遷移させる
    }
  }

  // 結果ページへ
  navigate('/result');
};