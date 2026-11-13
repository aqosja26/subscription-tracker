$(function () {
  const storageKey = "subscription-tracker.subscriptions";
  const $form = $("#subscription-form");
  const $viewSection = $("#view-section");
  const $subscriptionsBody = $viewSection.find("table tbody").first();
  const $totalSubscriptions = $("#total-subscriptions");
  const $expiredSubscriptions = $("#expired-subscriptions");

  if (!$form.length && !$viewSection.length) {
    throw new Error("Subscription form or view section was not found.");
  }

  if (
    $viewSection.length &&
    (!$subscriptionsBody.length || !$totalSubscriptions.length || !$expiredSubscriptions.length)
  ) {
    throw new Error("The view page is missing its table or summary outputs.");
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

  let subscriptions = loadSubscriptions();

  function renderSubscriptions() {
    if (!$viewSection.length) {
      return;
    }

    $subscriptionsBody.empty();

    if (subscriptions.length === 0) {
      const $row = $("<tr>");
      $("<td>").attr("colspan", 7).text("No subscriptions yet.").appendTo($row);
      $subscriptionsBody.append($row);
    } else {
      $.each(subscriptions, function (_, subscription) {
        const $row = $("<tr>");
        const values = [
          subscription.service,
          subscription.provider,
          subscription.subscriber,
          subscription.renewalDate,
          subscription.category,
          getStatus(subscription),
        ];

        $.each(values, function (_, value) {
          $("<td>").text(value).appendTo($row);
        });

        const $removeButton = $("<button>")
          .attr({
            type: "button",
            "data-subscription-id": subscription.id,
          })
          .addClass("btn btn-outline-danger btn-sm")
          .text("Remove");
        $("<td>").append($removeButton).appendTo($row);
        $subscriptionsBody.append($row);
      });
    }

    $totalSubscriptions.text(String(subscriptions.length));
    $expiredSubscriptions.text(
      String(subscriptions.filter((subscription) => getStatus(subscription) === "Expired").length),
    );
  }

  if ($form.length) {
    const $textInputs = $form.find(
      '[name="service"], [name="provider"], [name="subscriber"], [name="category"]',
    );

    $textInputs.on("input", function () {
      this.setCustomValidity(
        $(this).val().trim() ? "" : "Please enter a value that is not only whitespace.",
      );
    });

    $form.on("submit", function (event) {
      event.preventDefault();
      $textInputs.each(function () {
        this.setCustomValidity(
          $(this).val().trim() ? "" : "Please enter a value that is not only whitespace.",
        );
      });
      if (!this.reportValidity()) {
        return;
      }

      const fieldValue = (name) => String($form.find(`[name="${name}"]`).val()).trim();
      const subscription = {
        id: window.crypto.randomUUID(),
        service: fieldValue("service"),
        provider: fieldValue("provider"),
        subscriber: fieldValue("subscriber"),
        renewalDate: fieldValue("renewal-date"),
        category: fieldValue("category"),
      };
      const updatedSubscriptions = [...subscriptions, subscription];

      saveSubscriptions(updatedSubscriptions);
      subscriptions = updatedSubscriptions;
      renderSubscriptions();
      this.reset();
    });
  }

  if ($viewSection.length) {
    $subscriptionsBody.on("click", "button[data-subscription-id]", function () {
      const subscriptionId = $(this).attr("data-subscription-id");
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
});
