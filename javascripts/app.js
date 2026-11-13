const storageKey = "subscription-tracker.subscriptions";

const form = document.querySelector("#subscription-form");
const viewSection = document.querySelector("#view-section");
const subscriptionsBody = viewSection
  ? viewSection.querySelector("table tbody")
  : null;
const totalSubscriptionsOutput = document.querySelector("#total-subscriptions");
const expiredSubscriptionsOutput = document.querySelector("#expired-subscriptions");

if (!form && !viewSection) {
  throw new Error("Subscription form or view section was not found.");
}

if (
  viewSection &&
  (!(subscriptionsBody instanceof HTMLTableSectionElement) ||
    !(totalSubscriptionsOutput instanceof HTMLOutputElement) ||
    !(expiredSubscriptionsOutput instanceof HTMLOutputElement))
) {
  throw new Error("The view page is missing its table or summary outputs.");
}

function getInput(name) {
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Subscription form was not found.");
  }
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Subscription form input "${name}" was not found.`);
  }
  return input;
}

let subscriptions = loadSubscriptions();

if (form) {
  const inputs = {
    service: getInput("service"),
    provider: getInput("provider"),
    subscriber: getInput("subscriber"),
    renewalDate: getInput("renewal-date"),
    category: getInput("category"),
  };

  Object.values(inputs).forEach((input) => {
    input.required = true;
  });

  const textInputs = [inputs.service, inputs.provider, inputs.subscriber, inputs.category];
  textInputs.forEach((input) => {
    input.addEventListener("input", () => {
      input.setCustomValidity(
        input.value.trim() ? "" : "Please enter a value that is not only whitespace.",
      );
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    textInputs.forEach((input) => {
      input.setCustomValidity(
        input.value.trim() ? "" : "Please enter a value that is not only whitespace.",
      );
    });
    if (!form.reportValidity()) {
      return;
    }

    const subscription = {
      id: crypto.randomUUID(),
      service: inputs.service.value.trim(),
      provider: inputs.provider.value.trim(),
      subscriber: inputs.subscriber.value.trim(),
      renewalDate: inputs.renewalDate.value,
      category: inputs.category.value.trim(),
    };

    const updatedSubscriptions = [...subscriptions, subscription];
    saveSubscriptions(updatedSubscriptions);
    subscriptions = updatedSubscriptions;
    renderSubscriptions();
    form.reset();
  });
}

function isSubscription(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.service === "string" &&
    typeof value.provider === "string" &&
    typeof value.subscriber === "string" &&
    typeof value.renewalDate === "string" &&
    typeof value.category === "string"
  );
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

function renderSubscriptions() {
  if (!viewSection) {
    return;
  }

  subscriptionsBody.replaceChildren();

  if (subscriptions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No subscriptions yet.";
    row.append(cell);
    subscriptionsBody.append(row);
  } else {
    subscriptions.forEach((subscription) => {
      const row = document.createElement("tr");
      const values = [
        subscription.service,
        subscription.provider,
        subscription.subscriber,
        subscription.renewalDate,
        subscription.category,
        getStatus(subscription),
      ];

      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });

      const actionCell = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "btn btn-outline-danger btn-sm";
      removeButton.dataset.subscriptionId = subscription.id;
      removeButton.textContent = "Remove";
      actionCell.append(removeButton);
      row.append(actionCell);
      subscriptionsBody.append(row);
    });
  }

  totalSubscriptionsOutput.value = String(subscriptions.length);
  expiredSubscriptionsOutput.value = String(
    subscriptions.filter((subscription) => getStatus(subscription) === "Expired").length,
  );
}

if (viewSection) {
  subscriptionsBody.addEventListener("click", (event) => {
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