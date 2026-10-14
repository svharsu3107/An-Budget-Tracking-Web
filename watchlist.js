document.getElementById("addItemBtn").addEventListener("click", () => {
  const itemName = document.getElementById("itemName").value;
  const link = document.getElementById("itemLink").value;
  const price = Number(document.getElementById("itemPrice").value);
  const category = document.getElementById("itemCategory").value;
  if (!itemName || !price || !currentUserId) return;

  db.collection("users").doc(currentUserId).collection("watchlist").add({
    itemName, link, category,
    currentPrice: price,
    priceHistory: [{ price, date: new Date().toISOString() }],
    lastVerdict: null
  }).then(() => {
    document.getElementById("itemName").value = "";
    document.getElementById("itemLink").value = "";
    document.getElementById("itemPrice").value = "";
    loadWatchlist(currentUserId);
  });
});

async function loadWatchlist(uid) {
  const snap = await db.collection("users").doc(uid).collection("watchlist").get();
  const container = document.getElementById("watchlistItems");
  container.innerHTML = "";

  snap.forEach(docSnap => {
    const item = docSnap.data();
    const el = renderWatchItem(docSnap.id, item);
    container.appendChild(el);
  });
}

function renderWatchItem(id, item) {
  const div = document.createElement("div");
  div.className = "watch-item";

  const verdictHtml = item.lastVerdict
    ? `<span class="verdict-tag verdict-${item.lastVerdict.decision}">${item.lastVerdict.decision.toUpperCase()}</span>
       <p style="font-size:0.85rem;color:var(--muted);">${item.lastVerdict.reasoning}</p>`
    : `<p style="font-size:0.85rem;color:var(--muted);">No verdict yet — update the price to get one.</p>`;

  div.innerHTML = `
    <strong>${item.itemName}</strong>
    <div class="price-line">
      <span>₹${item.currentPrice}</span>
      <a href="${item.link}" target="_blank">View</a>
    </div>
    ${verdictHtml}
    <input type="number" placeholder="Update price (₹)" class="newPriceInput" />
    <button class="updatePriceBtn">Check Price</button>
  `;

  div.querySelector(".updatePriceBtn").addEventListener("click", async () => {
    const newPrice = Number(div.querySelector(".newPriceInput").value);
    if (!newPrice) return;
    await updateItemPrice(id, newPrice);
    loadWatchlist(currentUserId);
  });

  return div;
}

// Compares new price vs last price; re-runs verdict and notifies on a drop
async function updateItemPrice(itemId, newPrice) {
  const itemRef = db.collection("users").doc(currentUserId).collection("watchlist").doc(itemId);
  const itemSnap = await itemRef.get();
  const item = itemSnap.data();

  const lastPrice = item.currentPrice;
  const priceDropped = newPrice < lastPrice;
  const dropPercent = (((lastPrice - newPrice) / lastPrice) * 100).toFixed(1);

  const updatedHistory = [...item.priceHistory, { price: newPrice, date: new Date().toISOString() }];
  await itemRef.update({ currentPrice: newPrice, priceHistory: updatedHistory });

  // Always re-run the verdict on manual check-in, not just on a drop,
  // since the user's budget may have changed even if price hasn't.
  const verdict = await getVerdict({ ...item, priceHistory: updatedHistory }, newPrice);
  await itemRef.update({ lastVerdict: verdict });

  if (priceDropped) {
    showNotification({
      title: "Price Drop! 🔔",
      message: `${item.itemName} dropped from ₹${lastPrice} → ₹${newPrice} (${dropPercent}% off)`,
      verdict: verdict.decision,
      reasoning: verdict.reasoning
    });
  }
}

function showNotification({ title, message, verdict, reasoning }) {
  const banner = document.createElement("div");
  banner.className = `notification verdict-${verdict}`;
  banner.innerHTML = `
    <strong>${title}</strong>
    <p>${message}</p>
    <span class="verdict-tag verdict-${verdict}">${verdict.toUpperCase()}</span>
    <p style="font-size:0.85rem;">${reasoning}</p>
  `;
  document.getElementById("notificationArea").appendChild(banner);
  setTimeout(() => banner.remove(), 8000);
}
