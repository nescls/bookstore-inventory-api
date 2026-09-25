# Bookstore Inventory

Inventory and suggested selling prices for books imported at a cost in US dollars.

## Language

**Book**:
An inventory record identifying a book edition by ISBN, with one stock quantity.

**Stock quantity**:
The number of copies held for a book in the inventory.

**USD cost**:
The book's acquisition cost expressed in US dollars.

**Local currency**:
The Venezuelan bolívar, identified by the currency code VES.

**Exchange rate**:
The number of Venezuelan bolívares corresponding to one US dollar.

**Local cost**:
The USD cost converted into VES and rounded to two decimal places.

**Markup**:
The percentage added to local cost to obtain the suggested selling price; 40% for this assessment.
_Avoid_: Profit margin on revenue.

**Suggested selling price**:
The local cost plus the markup, expressed in VES and rounded to two decimal places.
The saved value is refreshed by an explicit price calculation or an actual change in USD cost.

**Stored exchange rate**:
A recorded USD-to-VES exchange rate. The most recently created record supplies the
fallback value when the external provider cannot supply a valid rate.

**Canonical ISBN**:
The validated 13-digit identifier used to identify a book edition uniquely;
equivalent legacy ISBN-10 input identifies the same edition.
