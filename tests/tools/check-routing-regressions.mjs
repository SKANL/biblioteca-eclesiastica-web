/** Run against a production page with real API fixtures; no Link/component mocks. */
export default async function checkRoutingRegressions(page, { base = process.env.WEB_BASE_URL || "http://127.0.0.1:3010" } = {}) {
  const results = [];
  const equal = (actual, expected) => {
    if (actual !== expected) throw new Error(`${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  };
  for (const [viewport, size] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    await page.setViewportSize(size);
    await page.goto(`${base}/biblioteca`);
    await page.getByLabel("Autor", { exact: true }).fill("He");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await page.waitForURL("**/biblioteca?autor=He");
    await page.getByRole("button", { name: "Limpiar", exact: true }).click();
    await page.waitForURL("**/biblioteca");
    await page.goBack();
    await page.getByRole("button", { name: "Limpiar", exact: true }).waitFor();
    equal(await page.getByLabel("Autor", { exact: true }).inputValue(), "He");
    await page.goForward();
    await page.waitForURL("**/biblioteca");
    equal(await page.getByLabel("Autor", { exact: true }).inputValue(), "");
    results.push({ viewport, check: "library filter history", passed: true });

    await page.goto(`${base}/buscar?q=identity`);
    await page.getByLabel("Buscar en el catálogo", { exact: true }).fill("hypothesis");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await page.waitForURL("**/buscar?q=hypothesis");
    await page.goBack();
    await page.getByRole("heading", { name: "Resultados para «identity»", exact: true }).waitFor();
    equal(await page.getByLabel("Buscar en el catálogo", { exact: true }).inputValue(), "identity");
    await page.goForward();
    await page.getByRole("heading", { name: "Resultados para «hypothesis»", exact: true }).waitFor();
    equal(await page.getByLabel("Buscar en el catálogo", { exact: true }).inputValue(), "hypothesis");
    results.push({ viewport, check: "search query history", passed: true });

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
    await page.goto(`${base}/libro/resnet/pagina/3?ver=texto`);
    await page.getByRole("button", { name: "Copiar cita", exact: true }).click();
    await page.getByText("Cita copiada al portapapeles.", { exact: true }).waitFor();
    await page.getByLabel("Estilo", { exact: true }).selectOption("chicago");
    equal(await page.locator("p.select-all").count(), 0);
    equal(await page.getByText("Cita copiada al portapapeles.", { exact: true }).count(), 0);
    results.push({ viewport, check: "citation style invalidates feedback", passed: true });

    await page.getByRole("button", { name: "Copiar cita", exact: true }).click();
    await page.getByText("Cita copiada al portapapeles.", { exact: true }).waitFor();
    await page.route("**/api/v1/cite/**", (route) => route.abort("failed"));
    try {
      await page.getByRole("button", { name: "Copiar cita", exact: true }).click();
      await page.getByText("No se pudo conectar con el servidor de la biblioteca.", { exact: true }).waitFor();
      equal(await page.locator("p.select-all").count(), 0);
    } finally {
      await page.unroute("**/api/v1/cite/**");
    }
    results.push({ viewport, check: "citation failure clears old text", passed: true });

    await page.goto(`${base}/libro/resnet/pagina/3?ver=imagen&q=hypothesis`);
    await page.reload();
    await page.locator("[data-target]").waitFor();
    equal(await page.getByText("Cargando imagen…", { exact: true }).count(), 0);
    const imageSource = await page.locator("img").first().getAttribute("src");
    if (!imageSource) throw new Error("Reader image source is missing");
    const imagePath = new URL(imageSource, base).pathname;
    const imageRoute = (url) => url.pathname === imagePath;
    await page.route(imageRoute, (route) => route.abort("failed"));
    try {
      await page.reload();
      await page.getByText("No se pudo cargar la imagen.", { exact: true }).waitFor();
    } finally {
      await page.unroute(imageRoute);
    }
    await page.getByRole("button", { name: "Reintentar imagen", exact: true }).click();
    await page.locator("[data-target]").waitFor();
    results.push({ viewport, check: "pre-hydration image completion and error retry", passed: true });

    await page.goto(`${base}/libro/no-such-book`);
    await page.getByRole("heading", { name: "Libro no encontrado", exact: true }).waitFor();
    equal(await page.getByRole("navigation", { name: "Navegación principal" }).count(), 1);
    equal(await page.locator("footer").count(), 1);
    await page.getByRole("link", { name: "Volver a la biblioteca", exact: true }).click();
    await page.waitForURL("**/biblioteca");
    results.push({ viewport, check: "missing book keeps single site chrome and recovery", passed: true });
  }
  return results;
}
