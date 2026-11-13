(() => {
  const storageKey = "subscription-tracker.subscriptions";
  const form = document.querySelector("#subscription-form");
  const viewSection = document.querySelector("#view-section");
  const tableBody = document.querySelector("#subscription-rows");
  const totalOutput = document.querySelector("#total-subscriptions");
  const expiredOutput = document.querySelector("#expired-subscriptions");

  if (!form && !viewSection) {
    throw new Error("Subscription form or view section was not found.");
  }

  if (viewSection && (
    !(tableBody instanceof HTMLTableSectionElement) ||
    !(totalOutput instanceof HTMLOutputElement) ||
    !(expiredOutput instanceof HTMLOutputElement)
  )) {
    throw new Error("The view page is missing its table or summary outputs.");
  }

  function isSubscription(value) {
    return value !== null &&
      typeof value === "object" &&
      typeof value.id === "string" &&
      typeof value.service === "string" &&
      typeof value.provider === "string" &&
      typeof value.subscriber === "string" &&
      typeof value.renewalDate === "string" &&
      typeof value.category === "string";
  }

  function loadSubscriptions() {
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null) {
      return [];
    }

    let parsedValue;
    try {
      parsedValue = JSON.parse(storedValue);
    } catch (error) {
      throw new Error("Saved subscriptions contain invalid JSON.", { cause: error });
    }

    if (!Array.isArray(parsedValue) || !parsedValue.every(isSubscription)) {
      throw new Error("Saved subscriptions have an invalid format.");
    }

    return parsedValue;
  }

  function saveSubscriptions(items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  function getToday() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  function getStatus(subscription) {
    return subscription.renewalDate < getToday() ? "Expired" : "Active";
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  let subscriptions = loadSubscriptions();

  function renderSubscriptions() {
    if (!viewSection) {
      return;
    }

    tableBody.replaceChildren();

    if (subscriptions.length === 0) {
      const row = document.createElement("tr");
      row.className = "empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "No subscriptions yet.";
      row.append(cell);
      tableBody.append(row);
    } else {
      subscriptions.forEach((subscription) => {
        const row = document.createElement("tr");
        [
          subscription.service,
          subscription.provider,
          subscription.subscriber,
          subscription.renewalDate,
          subscription.category,
          getStatus(subscription),
        ].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });

        const actionCell = document.createElement("td");
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-button";
        removeButton.dataset.subscriptionId = subscription.id;
        removeButton.textContent = "Remove";
        actionCell.append(removeButton);
        row.append(actionCell);
        tableBody.append(row);
      });
    }

    totalOutput.textContent = String(subscriptions.length);
    expiredOutput.textContent = String(
      subscriptions.filter((subscription) => getStatus(subscription) === "Expired").length,
    );
  }

  if (form) {
    const fieldNames = ["service", "provider", "subscriber", "renewal-date", "category"];
    const fields = fieldNames.map((name) => {
      const field = form.elements.namedItem(name);
      if (!(field instanceof HTMLInputElement)) {
        throw new Error(`Subscription form input "${name}" was not found.`);
      }
      return field;
    });
    const textFields = fields.filter((field) => field.type !== "date");
    const validateTextFields = () => {
      textFields.forEach((field) => {
        field.setCustomValidity(
          field.value.trim() ? "" : "Please enter a value that is not only whitespace.",
        );
      });
    };

    textFields.forEach((field) => {
      field.addEventListener("input", validateTextFields);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      validateTextFields();
      if (!form.reportValidity()) {
        return;
      }

      const fieldValue = (name) => form.elements.namedItem(name).value.trim();
      const subscription = {
        id: createId(),
        service: fieldValue("service"),
        provider: fieldValue("provider"),
        subscriber: fieldValue("subscriber"),
        renewalDate: fieldValue("renewal-date"),
        category: fieldValue("category"),
      };
      const updatedSubscriptions = [...subscriptions, subscription];

      saveSubscriptions(updatedSubscriptions);
      subscriptions = updatedSubscriptions;
      form.reset();
    });
  }

  if (viewSection) {
    tableBody.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const button = event.target.closest("button[data-subscription-id]");
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const subscriptionId = button.dataset.subscriptionId;
      if (!subscriptionId) {
        throw new Error("Remove button is missing its subscription ID.");
      }

      const updatedSubscriptions = subscriptions.filter(
        (subscription) => subscription.id !== subscriptionId,
      );
      saveSubscriptions(updatedSubscriptions);
      subscriptions = updatedSubscriptions;
      renderSubscriptions();
    });
  }

  renderSubscriptions();
})();